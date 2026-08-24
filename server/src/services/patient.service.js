import { database } from "../db/database.js";
import { AppError } from "../utils/app-error.js";
import { randomUUID } from "node:crypto";
import { recalculateVisitBill } from "./visit-billing.service.js";

const select = `SELECT p.id, p.patient_number AS patientNumber, p.first_name AS firstName, p.last_name AS lastName, p.father_name AS fatherName, p.cnic, p.phone, p.address, p.registration_locked AS registrationLocked, p.is_active AS isActive, p.created_at AS createdAt, p.updated_at AS updatedAt, d.id AS doctorId, d.first_name AS doctorFirstName, d.last_name AS doctorLastName, d.specialization AS doctorSpecialization, u.id AS createdById, u.first_name AS createdByFirstName, u.last_name AS createdByLastName FROM patients p JOIN doctors d ON d.id = p.doctor_id JOIN users u ON u.id = p.created_by`;
const present = (row) =>
  row && {
    ...row,
    registrationLocked: Boolean(row.registrationLocked),
    isActive: Boolean(row.isActive),
    doctor: {
      id: row.doctorId,
      firstName: row.doctorFirstName,
      lastName: row.doctorLastName,
      specialization: row.doctorSpecialization,
    },
    createdBy: {
      id: row.createdById,
      firstName: row.createdByFirstName,
      lastName: row.createdByLastName,
    },
  };
const normalizeCnic = (value) => {
  const digits = value.replace(/\D/g, "");
  if (!/^\d{13}$/.test(digits))
    throw new AppError(400, "CNIC must contain 13 digits");
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
};
const normalizePhone = (value) => {
  const digits = String(value).replace(/\D/g, "");
  if (/^03\d{9}$/.test(digits)) return `+92${digits.slice(1)}`;
  if (/^92\d{10}$/.test(digits)) return `+${digits}`;
  throw new AppError(400, "Enter a valid Pakistani mobile number", [], "phone");
};
const patientData = (patient) => ({
  patientNumber: patient.patientNumber,
  firstName: patient.firstName,
  lastName: patient.lastName,
  fatherName: patient.fatherName,
  cnic: patient.cnic,
  phone: patient.phone,
  address: patient.address,
  doctorId: patient.doctor.id,
  isActive: patient.isActive,
});
const presentPayment = (row) => ({
  id: row.id,
  receiptNumber: row.receiptNumber,
  amount: Number(row.amount),
  feeType: row.feeType,
  paymentMethod: row.paymentMethod,
  paymentStatus: row.paymentStatus,
  paidAt: row.paidAt,
  patient: {
    id: row.patientId,
    patientNumber: row.patientNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    cnic: row.cnic,
    fatherName: row.fatherName,
    doctorName: row.doctorName,
  },
  receivedBy: {
    id: row.receivedById,
    firstName: row.receivedByFirstName,
    lastName: row.receivedByLastName,
  },
});

async function getById(id, connection = database) {
  const [rows] = await connection.execute(`${select} WHERE p.id = ?`, [id]);
  if (!rows.length) throw new AppError(404, "Patient not found");
  return present(rows[0]);
}
async function activeDoctor(id, connection) {
  const [rows] = await connection.execute(
    "SELECT id FROM doctors WHERE id = ? AND is_active = TRUE",
    [id],
  );
  if (!rows.length)
    throw new AppError(400, "Selected doctor was not found or is inactive");
}
async function registrationAudit(
  connection,
  patientId,
  userId,
  action,
  oldData,
  newData,
) {
  await connection.execute(
    "INSERT INTO patient_registration_audit (patient_id, user_id, action, old_data, new_data) VALUES (?, ?, ?, ?, ?)",
    [
      patientId,
      userId,
      action,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
    ],
  );
}
async function findDuplicate(
  field,
  value,
  connection = database,
  excludeId = null,
) {
  const column = field === "cnic" ? "cnic" : "phone";
  const values = excludeId ? [value, excludeId] : [value];
  const [rows] = await connection.execute(
    `SELECT p.id, p.patient_number AS patientNumber, p.first_name AS firstName, p.last_name AS lastName, p.cnic, p.phone, (SELECT MAX(v.visit_date) FROM patient_visits v WHERE v.patient_id=p.id) AS lastVisit, (SELECT COUNT(*) FROM patient_visits v WHERE v.patient_id=p.id) AS totalVisits FROM patients p WHERE p.${column} = ? AND p.is_active = TRUE${excludeId ? " AND p.id != ?" : ""} LIMIT 1`,
    values,
  );
  return rows[0] || null;
}

export const patientService = {
  normalizeCnic,
  normalizePhone,
  async create(data, actorId) {
    const cnic = normalizeCnic(data.cnic);
    const phone = normalizePhone(data.phone);
    const connection = await database.getConnection();
    let locked = false;
    try {
      const [lockRows] = await connection.query(
        "SELECT GET_LOCK('hms_patient_number', 10) AS locked",
      );
      locked = lockRows[0].locked === 1;
      if (!locked)
        throw new AppError(
          503,
          "Unable to reserve a patient number. Please try again.",
        );
      await connection.beginTransaction();
      await activeDoctor(data.doctorId, connection);
      const cnicDuplicate = await findDuplicate("cnic", cnic, connection);
      if (cnicDuplicate)
        throw new AppError(
          409,
          "A patient with this CNIC already exists.",
          [{ patientId: cnicDuplicate.id }],
          "cnic",
        );
      const phoneDuplicate = await findDuplicate("phone", phone, connection);
      if (phoneDuplicate)
        throw new AppError(
          409,
          "A patient with this phone number already exists.",
          [{ patientId: phoneDuplicate.id }],
          "phone",
        );
      const year = new Date().getFullYear();
      const prefix = `PAT-${year}-`;
      const [latest] = await connection.execute(
        "SELECT patient_number AS patientNumber FROM patients WHERE patient_number LIKE ? ORDER BY patient_number DESC LIMIT 1 FOR UPDATE",
        [`${prefix}%`],
      );
      const sequence = latest.length
        ? Number(latest[0].patientNumber.slice(-6)) + 1
        : 1;
      const patientNumber = `${prefix}${String(sequence).padStart(6, "0")}`;
      const [result] = await connection.execute(
        "INSERT INTO patients (patient_number, first_name, last_name, father_name, cnic, phone, address, doctor_id, created_by, registration_locked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)",
        [
          patientNumber,
          data.firstName,
          data.lastName,
          data.fatherName,
          cnic,
          phone,
          data.address,
          data.doctorId,
          actorId,
        ],
      );
      const patient = await getById(result.insertId, connection);
      const [visitResult] = await connection.execute(
        "INSERT INTO patient_visits (patient_id, visit_number, visit_date, doctor_id, created_by, status) VALUES (?, 1, CURDATE(), ?, ?, 'OPEN')",
        [patient.id, data.doctorId, actorId],
      );
      const [feeRows] = await connection.execute(
        "SELECT setting_value AS amount FROM settings WHERE setting_key = 'REGISTRATION_FEE' FOR UPDATE",
      );
      const configuredFee = Number(feeRows[0]?.amount);
      if (!Number.isFinite(configuredFee) || configuredFee < 0)
        throw new AppError(500, "Registration fee is not configured correctly");
      const feeType = data.feeType || "FREE";
      const amount = feeType === "FREE" ? 0 : feeType === "ACTUAL" ? configuredFee : Number(data.registrationFee);
      if (
        feeType === "DISCOUNTED" &&
        (!Number.isFinite(amount) || amount < 0 || amount > configuredFee)
      )
        throw new AppError(
          400,
          "Discounted registration fee must be between PKR 0 and the configured registration fee.",
          [],
          "registrationFee",
        );
      const receiptPrefix = `REC-${year}-`;
      const [latestReceipt] = await connection.execute(
        "SELECT receipt_number AS receiptNumber FROM registration_payments WHERE receipt_number LIKE ? ORDER BY receipt_number DESC LIMIT 1 FOR UPDATE",
        [`${receiptPrefix}%`],
      );
      const receiptNumber = `${receiptPrefix}${String(latestReceipt.length ? Number(latestReceipt[0].receiptNumber.slice(-6)) + 1 : 1).padStart(6, "0")}`;
      const [paymentResult] = await connection.execute(
        "INSERT INTO registration_payments (patient_id, visit_id, receipt_number, amount, fee_type, payment_method, payment_status, received_by) VALUES (?, ?, ?, ?, ?, ?, 'PAID', ?)",
        [
          patient.id,
          visitResult.insertId,
          receiptNumber,
          amount,
          feeType,
          data.paymentMethod,
          actorId,
        ],
      );
      const [paymentRows] = await connection.execute(
        `SELECT rp.id, rp.receipt_number AS receiptNumber, rp.amount, rp.fee_type AS feeType, rp.payment_method AS paymentMethod, rp.payment_status AS paymentStatus, rp.paid_at AS paidAt, p.id AS patientId, p.patient_number AS patientNumber, p.first_name AS firstName, p.last_name AS lastName, p.cnic, p.father_name AS fatherName, CONCAT('Dr. ', d.first_name, ' ', d.last_name) AS doctorName, u.id AS receivedById, u.first_name AS receivedByFirstName, u.last_name AS receivedByLastName FROM registration_payments rp JOIN patients p ON p.id = rp.patient_id JOIN doctors d ON d.id = p.doctor_id JOIN users u ON u.id = rp.received_by WHERE rp.id = ?`,
        [paymentResult.insertId],
      );
      const payment = presentPayment(paymentRows[0]);
      await recalculateVisitBill(connection, visitResult.insertId, actorId);
      const [actors] = await connection.execute("SELECT CONCAT(first_name,' ',last_name) AS name FROM users WHERE id=?", [actorId]);
      const actorName = actors[0]?.name || "System";
      const patientName = `${patient.firstName} ${patient.lastName}`;
      await registrationAudit(
        connection,
        patient.id,
        actorId,
        "CREATED",
        null,
        patientData(patient),
      );
      await connection.execute(
        "INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details, new_data) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          randomUUID(),
          actorId,
          "PATIENT_CREATED",
          "PATIENT",
          String(patient.id),
          `${actorName} registered patient ${patientName} (${patient.patientNumber}).`,
          JSON.stringify(patient),
        ],
      );
      await connection.execute(
        "INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details, new_data) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          randomUUID(),
          actorId,
          "REGISTRATION_PAYMENT_CREATED",
          "REGISTRATION_PAYMENT",
          String(payment.id),
          `${actorName} recorded a ${payment.feeType.toLowerCase()} registration fee of PKR ${payment.amount.toLocaleString("en-PK")} for ${patientName} (${patient.patientNumber}).`,
          JSON.stringify(payment),
        ],
      );
      await connection.commit();
      return { patient, payment };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      if (locked)
        await connection.query("SELECT RELEASE_LOCK('hms_patient_number')");
      connection.release();
    }
  },
  async get(id) {
    const patient = await getById(id);
    const [services] = await database.execute(
      `SELECT ps.id, ps.visit_id AS visitId, v.visit_number AS visitNumber, v.visit_date AS visitDate, s.name AS serviceName, s.code AS serviceCode, d.name AS departmentName, d.code AS departmentCode, ps.quantity, ps.unit_price AS unitPrice, ps.total_amount AS totalAmount, ps.status, ps.created_at AS createdAt, u.first_name AS addedByFirstName, u.last_name AS addedByLastName FROM patient_services ps LEFT JOIN patient_visits v ON v.id=ps.visit_id JOIN services s ON s.id = ps.service_id JOIN departments d ON d.id = s.department_id JOIN users u ON u.id = ps.added_by WHERE ps.patient_id = ? ORDER BY COALESCE(v.visit_number,0) DESC, ps.created_at DESC`,
      [id],
    );
    return {
      ...patient,
      services: services.map((service) => ({
        ...service,
        unitPrice: Number(service.unitPrice),
        totalAmount: Number(service.totalAmount),
        addedBy: `${service.addedByFirstName} ${service.addedByLastName}`,
      })),
    };
  },
  async checkDuplicate(field, value) {
    const normalized =
      field === "cnic" ? normalizeCnic(value) : normalizePhone(value);
    const patient = await findDuplicate(field, normalized);
    return { exists: Boolean(patient), ...(patient ? { patient } : {}) };
  },
  async list({ page, limit, search }) {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safeLimit =
      Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
    const safeOffset = Math.max(0, (safePage - 1) * safeLimit);
    const term = search ? `%${search.trim()}%` : null;
    const where = term
      ? "WHERE p.patient_number LIKE ? OR p.cnic LIKE ? OR p.phone LIKE ? OR CONCAT(p.first_name, ' ', p.last_name) LIKE ?"
      : "";
    const params = term ? [term, term, term, term] : [];
    const [rows] = await database.execute(
      `${select} ${where} ORDER BY p.created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params,
    );
    const [counts] = await database.execute(
      `SELECT COUNT(*) AS total FROM patients p ${where}`,
      params,
    );
    const total = counts[0].total;
    return {
      items: rows.map(present),
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total ? Math.ceil(total / safeLimit) : 0,
    };
  },
  async search(query) {
    const value = query.trim();
    const cnic =
      value.replace(/\D/g, "").length === 13 ? normalizeCnic(value) : null;
    const [rows] = await database.execute(
      `${select} WHERE p.is_active = TRUE AND (p.cnic = ? OR p.patient_number = ? OR p.phone LIKE ? OR CONCAT(p.first_name, ' ', p.last_name) LIKE ?) ORDER BY p.created_at DESC LIMIT 50`,
      [cnic || value, value, `%${value}%`, `%${value}%`],
    );
    return rows.map(present);
  },
  async update(id, data, actorId) {
    const previous = await getById(id);
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      if (data.doctorId) await activeDoctor(data.doctorId, connection);
      const changes = {
        firstName: "first_name",
        lastName: "last_name",
        fatherName: "father_name",
        cnic: "cnic",
        phone: "phone",
        address: "address",
        doctorId: "doctor_id",
      };
      const entries = Object.entries(changes).filter(([key]) => key in data);
      const values = entries.map(([key]) =>
        key === "cnic"
          ? normalizeCnic(data[key])
          : key === "phone"
            ? normalizePhone(data[key])
            : data[key],
      );
      if (
        "cnic" in data &&
        (await findDuplicate("cnic", normalizeCnic(data.cnic), connection, id))
      )
        throw new AppError(
          409,
          "A patient with this CNIC already exists.",
          [],
          "cnic",
        );
      if (
        "phone" in data &&
        (await findDuplicate(
          "phone",
          normalizePhone(data.phone),
          connection,
          id,
        ))
      )
        throw new AppError(
          409,
          "A patient with this phone number already exists.",
          [],
          "phone",
        );
      await connection.execute(
        `UPDATE patients SET ${entries.map(([, column]) => `${column} = ?`).join(", ")} WHERE id = ?`,
        [...values, id],
      );
      const patient = await getById(id, connection);
      await registrationAudit(
        connection,
        id,
        actorId,
        "UPDATED",
        patientData(previous),
        patientData(patient),
      );
      await connection.commit();
      return { previous, patient };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
  async remove(id) {
    await getById(id);
    await database.execute(
      "UPDATE patients SET is_active = FALSE WHERE id = ?",
      [id],
    );
    return this.get(id);
  },
};
