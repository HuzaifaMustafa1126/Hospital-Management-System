import { database } from "../db/database.js";
import { AppError } from "../utils/app-error.js";
import { randomUUID } from "node:crypto";
const select = `SELECT v.id, v.patient_id AS patientId, v.visit_number AS visitNumber, v.visit_date AS visitDate, v.status, v.created_at AS createdAt, v.updated_at AS updatedAt, d.first_name AS doctorFirstName, d.last_name AS doctorLastName, p.patient_number AS patientNumber, p.first_name AS patientFirstName, p.last_name AS patientLastName, p.cnic AS patientCnic, p.phone AS patientPhone, COALESCE(rp.amount, 0) AS visitFee, rp.fee_type AS feeType, COALESCE(SUM(ps.total_amount), 0) AS servicesTotal, COUNT(ps.id) AS servicesCount FROM patient_visits v JOIN patients p ON p.id=v.patient_id LEFT JOIN doctors d ON d.id=v.doctor_id LEFT JOIN registration_payments rp ON rp.visit_id=v.id LEFT JOIN patient_services ps ON ps.visit_id=v.id`;
const present = (row) => ({
  ...row,
  doctorName: row.doctorFirstName
    ? `Dr. ${row.doctorFirstName} ${row.doctorLastName}`
    : "—",
  patientName: `${row.patientFirstName} ${row.patientLastName}`,
  visitFee: Number(row.visitFee),
  servicesTotal: Number(row.servicesTotal),
  servicesCount: Number(row.servicesCount),
  total: Number(row.visitFee) + Number(row.servicesTotal),
});
export const visitService = {
  async list(patientId) {
    const [rows] = await database.execute(
      `${select} WHERE v.patient_id=? GROUP BY v.id, rp.id ORDER BY v.visit_number DESC`,
      [patientId],
    );
    return rows.map(present);
  },
  async get(id) {
    const [rows] = await database.execute(`${select} WHERE v.id=? GROUP BY v.id, rp.id`, [id]);
    if (!rows.length) throw new AppError(404, "Visit not found.");
    const visit = present(rows[0]);
    const [services] = await database.execute(
      `SELECT ps.id, s.name AS serviceName, ps.total_amount AS totalAmount, ps.status FROM patient_services ps JOIN services s ON s.id=ps.service_id WHERE ps.visit_id=? ORDER BY ps.created_at DESC`,
      [id],
    );
    const [payments] = await database.execute(
      `SELECT receipt_number AS receiptNumber, amount, fee_type AS feeType, paid_at AS paidAt FROM registration_payments WHERE visit_id=?`,
      [id],
    );
    return {
      ...visit,
      services: services.map((s) => ({
        ...s,
        totalAmount: Number(s.totalAmount),
      })),
      payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
    };
  },
  async create(patientId, data, actorId) {
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      const [patients] = await connection.execute(
        "SELECT id FROM patients WHERE id=? AND is_active=TRUE FOR UPDATE",
        [patientId],
      );
      if (!patients.length) throw new AppError(404, "Patient not found.");
      const [doctors] = await connection.execute(
        "SELECT id FROM doctors WHERE id=? AND is_active=TRUE",
        [data.doctorId],
      );
      if (!doctors.length) throw new AppError(400, "Selected doctor was not found or is inactive.");
      const [feeRows] = await connection.execute(
        "SELECT setting_value AS amount FROM settings WHERE setting_key='REGISTRATION_FEE' FOR UPDATE",
      );
      const configuredFee = Number(feeRows[0]?.amount);
      const visitFee = data.feeType === "FREE" ? 0 : data.feeType === "ACTUAL" ? configuredFee : Number(data.visitFee);
      if (!Number.isFinite(configuredFee) || configuredFee < 0)
        throw new AppError(500, "Registration fee is not configured correctly.");
      if (data.feeType === "FREE" && Number(data.visitFee) !== 0)
        throw new AppError(400, "A free visit must have a zero fee.", [], "visitFee");
      if (data.feeType === "ACTUAL" && Number(data.visitFee) !== configuredFee)
        throw new AppError(400, "The actual visit fee must match the configured fee.", [], "visitFee");
      if (data.feeType === "DISCOUNTED" && (visitFee < 0 || visitFee > configuredFee))
        throw new AppError(400, `Discounted visit fee must be between PKR 0 and PKR ${configuredFee}.`, [], "visitFee");
      const uniqueServiceIds = [...new Set(data.serviceIds)];
      let services = [];
      if (uniqueServiceIds.length) {
        const placeholders = uniqueServiceIds.map(() => "?").join(",");
        const [serviceRows] = await connection.execute(
          `SELECT id, name, price FROM services WHERE id IN (${placeholders}) AND is_active=TRUE FOR UPDATE`,
          uniqueServiceIds,
        );
        if (serviceRows.length !== uniqueServiceIds.length)
          throw new AppError(400, "One or more selected services are unavailable.");
        services = serviceRows;
      }
      const [latest] = await connection.execute(
        "SELECT visit_number AS visitNumber FROM patient_visits WHERE patient_id=? ORDER BY visit_number DESC LIMIT 1 FOR UPDATE",
        [patientId],
      );
      const visitNumber = (latest[0]?.visitNumber || 0) + 1;
      const [result] = await connection.execute(
        "INSERT INTO patient_visits (patient_id, visit_number, visit_date, doctor_id, created_by, status) VALUES (?, ?, CURDATE(), ?, ?, 'OPEN')",
        [patientId, visitNumber, data.doctorId, actorId],
      );
      const year = new Date().getFullYear();
      const receiptPrefix = `REC-${year}-`;
      const [latestReceipt] = await connection.execute(
        "SELECT receipt_number AS receiptNumber FROM registration_payments WHERE receipt_number LIKE ? ORDER BY receipt_number DESC LIMIT 1 FOR UPDATE",
        [`${receiptPrefix}%`],
      );
      const receiptNumber = `${receiptPrefix}${String(latestReceipt.length ? Number(latestReceipt[0].receiptNumber.slice(-6)) + 1 : 1).padStart(6, "0")}`;
      const [payment] = await connection.execute(
        "INSERT INTO registration_payments (patient_id, visit_id, receipt_number, amount, fee_type, payment_method, payment_status, received_by) VALUES (?, ?, ?, ?, ?, ?, 'PAID', ?)",
        [patientId, result.insertId, receiptNumber, visitFee, data.feeType, data.paymentMethod, actorId],
      );
      for (const service of services) {
        const price = Number(service.price);
        const [patientService] = await connection.execute(
          "INSERT INTO patient_services (patient_id, visit_id, service_id, quantity, unit_price, total_amount, added_by) VALUES (?, ?, ?, 1, ?, ?, ?)",
          [patientId, result.insertId, service.id, price, price, actorId],
        );
        await connection.execute(
          "INSERT INTO audit_logs (id,user_id,action,entity,entity_id,new_data) VALUES (?,?,'VISIT_SERVICE_ADDED','PATIENT_SERVICE',?,?)",
          [randomUUID(), actorId, String(patientService.insertId), JSON.stringify({ visitId: result.insertId, patientId: Number(patientId), serviceId: service.id, unitPrice: price, totalAmount: price })],
        );
      }
      const servicesTotal = services.reduce((sum, service) => sum + Number(service.price), 0);
      const [bill] = await connection.execute(
        "INSERT INTO visit_bills (visit_id, patient_id, visit_fee, services_total, total_amount, created_by) VALUES (?, ?, ?, ?, ?, ?)",
        [result.insertId, patientId, visitFee, servicesTotal, visitFee + servicesTotal, actorId],
      );
      await connection.execute(
        "INSERT INTO audit_logs (id,user_id,action,entity,entity_id,new_data) VALUES (?,?,'PATIENT_VISIT_CREATED','PATIENT_VISIT',?,?)",
        [
          randomUUID(),
          actorId,
          String(result.insertId),
          JSON.stringify({ patientId: Number(patientId), visitNumber, doctorId: data.doctorId, visitFee, feeType: data.feeType, serviceIds: uniqueServiceIds }),
        ],
      );
      await connection.execute(
        "INSERT INTO audit_logs (id,user_id,action,entity,entity_id,new_data) VALUES (?,?,'REGISTRATION_PAYMENT_CREATED','REGISTRATION_PAYMENT',?,?)",
        [randomUUID(), actorId, String(payment.insertId), JSON.stringify({ visitId: result.insertId, patientId: Number(patientId), receiptNumber, amount: visitFee, feeType: data.feeType, paymentMethod: data.paymentMethod })],
      );
      await connection.execute(
        "INSERT INTO audit_logs (id,user_id,action,entity,entity_id,new_data) VALUES (?,?,'VISIT_BILL_CREATED','VISIT_BILL',?,?)",
        [randomUUID(), actorId, String(bill.insertId), JSON.stringify({ visitId: result.insertId, patientId: Number(patientId), visitFee, servicesTotal, totalAmount: visitFee + servicesTotal })],
      );
      await connection.commit();
      return this.get(result.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};
