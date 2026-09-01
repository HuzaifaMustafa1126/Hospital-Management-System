import { database } from "../db/database.js";
import { AppError } from "../utils/app-error.js";
import { randomUUID } from "node:crypto";
import { currentOpenVisit, recalculateVisitBill } from "./visit-billing.service.js";

const patientSelect = `SELECT p.id, p.patient_number AS patientNumber, p.first_name AS firstName, p.last_name AS lastName, p.father_name AS fatherName, p.gender, p.cnic, p.phone, p.address, p.is_active AS isActive, p.created_at AS createdAt, d.id AS doctorId, d.first_name AS doctorFirstName, d.last_name AS doctorLastName, d.specialization AS doctorSpecialization, rp.fee_type AS registrationFeeType, rp.amount AS registrationFee FROM patients p JOIN doctors d ON d.id=p.doctor_id LEFT JOIN patient_visits v ON v.patient_id=p.id AND v.visit_number=1 LEFT JOIN registration_payments rp ON rp.visit_id=v.id`;
const presentPatient = (row) => ({ ...row, isActive: Boolean(row.isActive), registrationFee: row.registrationFee === null ? null : Number(row.registrationFee), doctor: { id: row.doctorId, firstName: row.doctorFirstName, lastName: row.doctorLastName, specialization: row.doctorSpecialization } });
const historySelect = `SELECT ps.id, ps.quantity, ps.unit_price AS unitPrice, ps.total_amount AS totalAmount, ps.notes, ps.status, ps.created_at AS createdAt, s.id AS serviceId, s.name AS serviceName, s.code AS serviceCode, u.first_name AS addedByFirstName, u.last_name AS addedByLastName FROM patient_services ps JOIN services s ON s.id=ps.service_id JOIN departments d ON d.id=s.department_id JOIN users u ON u.id=ps.added_by`;
const presentHistory = (row) => ({ ...row, unitPrice: Number(row.unitPrice), totalAmount: Number(row.totalAmount), addedBy: `${row.addedByFirstName} ${row.addedByLastName}` });

export const surgeryService = {
  async overview() {
    const [
      [serviceCount],
      [activeCount],
      [todayCount],
      [patientsToday],
      [services],
      [activity],
    ] = await Promise.all([
      database.execute(
        "SELECT COUNT(*) total FROM services s JOIN departments d ON d.id=s.department_id WHERE d.code='SUR'",
      ),
      database.execute(
        "SELECT COUNT(*) total FROM services s JOIN departments d ON d.id=s.department_id WHERE d.code='SUR' AND s.is_active=TRUE",
      ),
      database.execute(
        "SELECT COUNT(*) total FROM patient_services ps JOIN services s ON s.id=ps.service_id JOIN departments d ON d.id=s.department_id WHERE d.code='SUR' AND DATE(ps.created_at)=CURDATE()",
      ),
      database.execute(
        "SELECT COUNT(DISTINCT ps.patient_id) total FROM patient_services ps JOIN services s ON s.id=ps.service_id JOIN departments d ON d.id=s.department_id WHERE d.code='SUR' AND DATE(ps.created_at)=CURDATE()",
      ),
      database.execute(
        "SELECT s.id,s.name,s.code,s.description,s.price,s.is_active AS isActive FROM services s JOIN departments d ON d.id=s.department_id WHERE d.code='SUR' ORDER BY s.name",
      ),
      database.execute(
        "SELECT ps.id, s.name AS serviceName, ps.status, ps.created_at AS createdAt, p.id AS patientId, p.patient_number AS patientNumber, CONCAT(p.first_name,' ',p.last_name) AS patientName FROM patient_services ps JOIN patients p ON p.id=ps.patient_id JOIN services s ON s.id=ps.service_id JOIN departments d ON d.id=s.department_id WHERE d.code='SUR' ORDER BY ps.created_at DESC LIMIT 6",
      ),
    ]);
    return {
      serviceCount: Number(serviceCount[0].total),
      activeCount: Number(activeCount[0].total),
      todayCount: Number(todayCount[0].total),
      patientsToday: Number(patientsToday[0].total),
      services: services.map((s) => ({
        ...s,
        price: Number(s.price),
        isActive: Boolean(s.isActive),
      })),
      activity,
    };
  },
  async search(query) {
    const value = query.search?.trim();
    if (!value) return { items: [], page: query.page, limit: query.limit, total: 0, totalPages: 0 };
    const term = `%${value}%`;
    const where = " WHERE p.is_active=TRUE AND (p.cnic LIKE ? OR p.patient_number LIKE ? OR p.phone LIKE ? OR CONCAT(p.first_name,' ',p.last_name) LIKE ?)";
    const params = [term, term, term, term];
    const offset = (query.page - 1) * query.limit;
    const [rows] = await database.execute(`${patientSelect}${where} ORDER BY p.created_at DESC LIMIT ${query.limit} OFFSET ${offset}`, params);
    const [counts] = await database.execute(`SELECT COUNT(*) AS total FROM patients p${where}`, params);
    const total = Number(counts[0].total);
    return { items: rows.map(presentPatient), page: query.page, limit: query.limit, total, totalPages: total ? Math.ceil(total / query.limit) : 0 };
  },
  async getPatient(id) {
    const [rows] = await database.execute(`${patientSelect} WHERE p.id=? AND p.is_active=TRUE`, [id]);
    if (!rows.length) throw new AppError(404, "Patient not found.");
    const [history] = await database.execute(`${historySelect} WHERE ps.patient_id=? AND d.code='SUR' ORDER BY ps.created_at DESC`, [id]);
    return { ...presentPatient(rows[0]), surgeryServices: history.map(presentHistory) };
  },
  async availableServices() {
    const [rows] = await database.execute("SELECT s.id,s.name,s.code,s.description,s.price FROM services s JOIN departments d ON d.id=s.department_id WHERE d.code='SUR' AND s.is_active=TRUE AND d.is_active=TRUE ORDER BY s.name");
    return rows.map((row) => ({ ...row, price: Number(row.price), icon: "scissors" }));
  },
  async patientServices(patientId) {
    const [patients] = await database.execute("SELECT id FROM patients WHERE id=? AND is_active=TRUE", [patientId]);
    if (!patients.length) throw new AppError(404, "Patient not found.");
    const [history] = await database.execute(`${historySelect} WHERE ps.patient_id=? AND d.code='SUR' ORDER BY ps.created_at DESC`, [patientId]);
    return history.map(presentHistory);
  },
  async addService(patientId, input, actor) {
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      const [patients] = await connection.execute("SELECT id,patient_number AS patientNumber,CONCAT(first_name,' ',last_name) AS patientName FROM patients WHERE id=? AND is_active=TRUE FOR UPDATE", [patientId]);
      if (!patients.length) throw new AppError(404, "Patient not found.");
      const visit = await currentOpenVisit(connection, patientId);
      const [services] = await connection.execute("SELECT s.id,s.name,s.code,s.price,s.is_active AS isActive,d.code AS departmentCode,d.is_active AS departmentActive FROM services s JOIN departments d ON d.id=s.department_id WHERE s.id=? FOR UPDATE", [input.serviceId]);
      if (!services.length) throw new AppError(404, "Surgery service not found.");
      const service = services[0];
      if (service.departmentCode !== "SUR") throw new AppError(400, "Selected service is not a Surgery service.");
      if (!service.isActive || !service.departmentActive) throw new AppError(400, "This Surgery service is currently inactive.");
      if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new AppError(400, "Quantity must be a positive whole number.");
      const unitPrice = Number(service.price);
      const totalAmount = unitPrice * input.quantity;
      const [result] = await connection.execute("INSERT INTO patient_services (patient_id,visit_id,service_id,quantity,unit_price,total_amount,notes,added_by) VALUES (?,?,?,?,?,?,?,?)", [patientId, visit.id, input.serviceId, input.quantity, unitPrice, totalAmount, input.notes || null, actor.id]);
      await recalculateVisitBill(connection, visit.id, actor.id);
      const details = `${actor.firstName} ${actor.lastName} added ${service.name} (${service.code}) for ${patients[0].patientName} (${patients[0].patientNumber}), Visit #${visit.visitNumber}, for PKR ${totalAmount.toLocaleString("en-PK")}.`;
      await connection.execute("INSERT INTO audit_logs (id,user_id,action,entity,entity_id,details,new_data) VALUES (?,?,'SURGERY_SERVICE_ADDED','PATIENT_SERVICE',?,?,?)", [randomUUID(), actor.id, String(result.insertId), details, JSON.stringify({ patientId: Number(patientId), visitId: visit.id, serviceId: input.serviceId, quantity: input.quantity, unitPrice, totalAmount })]);
      await connection.commit();
      return { id: result.insertId, patientId: Number(patientId), visitId: visit.id, serviceId: input.serviceId, serviceName: service.name, serviceCode: service.code, quantity: input.quantity, unitPrice, totalAmount, notes: input.notes || null, status: "ADDED", details };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  },
};
