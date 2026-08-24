import { randomUUID } from "node:crypto";
import { database } from "../db/database.js";
import { AppError } from "../utils/app-error.js";
import { recalculateVisitBill } from "./visit-billing.service.js";

const bloodDepartment = "d.code IN ('BB','BLOOD_BANK')";
const patientSelect = `SELECT p.id,p.patient_number AS patientNumber,p.first_name AS firstName,p.last_name AS lastName,p.father_name AS fatherName,p.cnic,p.phone,p.address,p.created_at AS createdAt,d.id AS doctorId,d.first_name AS doctorFirstName,d.last_name AS doctorLastName,d.specialization AS doctorSpecialization,
  v.id AS latestVisitId,v.visit_number AS latestVisitNumber,v.visit_date AS latestVisitDate,v.status AS latestVisitStatus,vd.first_name AS visitDoctorFirstName,vd.last_name AS visitDoctorLastName
  FROM patients p JOIN doctors d ON d.id=p.doctor_id
  LEFT JOIN patient_visits v ON v.id=(SELECT v2.id FROM patient_visits v2 WHERE v2.patient_id=p.id ORDER BY v2.visit_number DESC LIMIT 1)
  LEFT JOIN doctors vd ON vd.id=v.doctor_id`;
const presentPatient = (row) => ({ ...row, doctor: { id: row.doctorId, firstName: row.doctorFirstName, lastName: row.doctorLastName, specialization: row.doctorSpecialization }, latestVisit: row.latestVisitId ? { id: row.latestVisitId, visitNumber: row.latestVisitNumber, visitDate: row.latestVisitDate, status: row.latestVisitStatus, doctorName: row.visitDoctorFirstName ? `Dr. ${row.visitDoctorFirstName} ${row.visitDoctorLastName}` : "—" } : null });
const historySelect = `SELECT ps.id,ps.patient_id AS patientId,ps.visit_id AS visitId,ps.quantity,ps.unit_price AS unitPrice,ps.total_amount AS totalAmount,ps.notes,ps.status,ps.created_at AS createdAt,s.id AS serviceId,s.name AS serviceName,s.code AS serviceCode,u.first_name AS addedByFirstName,u.last_name AS addedByLastName FROM patient_services ps JOIN services s ON s.id=ps.service_id JOIN departments d ON d.id=s.department_id JOIN users u ON u.id=ps.added_by`;
const presentHistory = (row) => ({ ...row, unitPrice: Number(row.unitPrice), totalAmount: Number(row.totalAmount), addedBy: `${row.addedByFirstName} ${row.addedByLastName}` });

export const bloodBankService = {
  async overview() {
    const [[today], [patients], [active], [activity]] = await Promise.all([
      database.execute(`SELECT COUNT(*) total FROM patient_services ps JOIN services s ON s.id=ps.service_id JOIN departments d ON d.id=s.department_id WHERE ${bloodDepartment} AND DATE(ps.created_at)=CURDATE()`),
      database.execute(`SELECT COUNT(DISTINCT ps.patient_id) total FROM patient_services ps JOIN services s ON s.id=ps.service_id JOIN departments d ON d.id=s.department_id WHERE ${bloodDepartment} AND DATE(ps.created_at)=CURDATE()`),
      database.execute(`SELECT COUNT(*) total FROM services s JOIN departments d ON d.id=s.department_id WHERE ${bloodDepartment} AND s.is_active=TRUE AND d.is_active=TRUE`),
      database.execute(`SELECT ps.id,ps.patient_id AS patientId,p.patient_number AS patientNumber,CONCAT(p.first_name,' ',p.last_name) AS patientName,s.name AS serviceName,ps.status,ps.created_at AS createdAt FROM patient_services ps JOIN patients p ON p.id=ps.patient_id JOIN services s ON s.id=ps.service_id JOIN departments d ON d.id=s.department_id WHERE ${bloodDepartment} ORDER BY ps.created_at DESC LIMIT 8`),
    ]);
    return { todayServices: Number(today[0].total), patientsToday: Number(patients[0].total), activeServices: Number(active[0].total), activity };
  },
  async search(query) {
    const value = query.search?.trim();
    if (!value) return { items: [], page: query.page, limit: query.limit, total: 0, totalPages: 0 };
    const term = `%${value}%`;
    const where = " WHERE p.is_active=TRUE AND (p.cnic LIKE ? OR p.patient_number LIKE ? OR p.phone LIKE ? OR CONCAT(p.first_name,' ',p.last_name) LIKE ?)";
    const params = [term, term, term, term];
    const offset = (query.page - 1) * query.limit;
    const [rows] = await database.execute(`${patientSelect}${where} ORDER BY p.created_at DESC LIMIT ${query.limit} OFFSET ${offset}`, params);
    const [counts] = await database.execute(`SELECT COUNT(*) total FROM patients p${where}`, params);
    const total = Number(counts[0].total);
    return { items: rows.map(presentPatient), page: query.page, limit: query.limit, total, totalPages: total ? Math.ceil(total / query.limit) : 0 };
  },
  async getPatient(id) {
    const [rows] = await database.execute(`${patientSelect} WHERE p.id=? AND p.is_active=TRUE`, [id]);
    if (!rows.length) throw new AppError(404, "Patient not found.");
    const [visits] = await database.execute("SELECT v.id,v.visit_number AS visitNumber,v.visit_date AS visitDate,v.status,CONCAT('Dr. ',d.first_name,' ',d.last_name) AS doctorName FROM patient_visits v LEFT JOIN doctors d ON d.id=v.doctor_id WHERE v.patient_id=? ORDER BY v.visit_number DESC", [id]);
    return { ...presentPatient(rows[0]), visits };
  },
  async availableServices() {
    const [rows] = await database.execute(`SELECT s.id,s.name,s.code,s.description,s.price FROM services s JOIN departments d ON d.id=s.department_id WHERE ${bloodDepartment} AND s.is_active=TRUE AND d.is_active=TRUE ORDER BY s.name`);
    return rows.map((row) => ({ ...row, price: Number(row.price), icon: row.code.includes("CROSS") ? "test-tube" : "droplets" }));
  },
  async visitServices(visitId) {
    const [visits] = await database.execute("SELECT id FROM patient_visits WHERE id=?", [visitId]);
    if (!visits.length) throw new AppError(404, "Visit not found.");
    const [rows] = await database.execute(`${historySelect} WHERE ps.visit_id=? AND ${bloodDepartment} ORDER BY ps.created_at DESC`, [visitId]);
    return rows.map(presentHistory);
  },
  async addService(visitId, input, actor) {
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      const [visits] = await connection.execute("SELECT v.id,v.patient_id AS patientId,v.visit_number AS visitNumber,v.status,p.patient_number AS patientNumber,CONCAT(p.first_name,' ',p.last_name) AS patientName FROM patient_visits v JOIN patients p ON p.id=v.patient_id WHERE v.id=? AND p.is_active=TRUE FOR UPDATE", [visitId]);
      if (!visits.length) throw new AppError(404, "Visit or active patient not found.");
      const visit = visits[0];
      if (visit.status !== "OPEN") throw new AppError(409, "Blood Bank services can only be added to an active visit.");
      const [services] = await connection.execute("SELECT s.id,s.name,s.code,s.price,s.is_active AS isActive,d.code AS departmentCode,d.is_active AS departmentActive FROM services s JOIN departments d ON d.id=s.department_id WHERE s.id=? FOR UPDATE", [input.serviceId]);
      if (!services.length) throw new AppError(404, "Blood Bank service not found.");
      const service = services[0];
      if (!["BB", "BLOOD_BANK"].includes(service.departmentCode)) throw new AppError(400, "Selected service is not a Blood Bank service.");
      if (!service.isActive || !service.departmentActive) throw new AppError(400, "This Blood Bank service is currently inactive.");
      if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new AppError(400, "Quantity must be a positive whole number.");
      const unitPrice = Number(service.price);
      const totalAmount = unitPrice * input.quantity;
      const [result] = await connection.execute("INSERT INTO patient_services (patient_id,visit_id,service_id,quantity,unit_price,total_amount,notes,added_by) VALUES (?,?,?,?,?,?,?,?)", [visit.patientId, visit.id, service.id, input.quantity, unitPrice, totalAmount, input.notes || null, actor.id]);
      const bill = await recalculateVisitBill(connection, visit.id, actor.id);
      const details = `${actor.firstName} ${actor.lastName} added ${service.name} (${service.code}) for ${visit.patientName} (${visit.patientNumber}), Visit #${visit.visitNumber}, for PKR ${totalAmount.toLocaleString("en-PK")}.`;
      await connection.execute("INSERT INTO audit_logs (id,user_id,action,entity,entity_id,details,new_data) VALUES (?,?,'BLOOD_BANK_SERVICE_ADDED','PATIENT_SERVICE',?,?,?)", [randomUUID(), actor.id, String(result.insertId), details, JSON.stringify({ patientId: visit.patientId, visitId: visit.id, serviceId: service.id, quantity: input.quantity, unitPrice, totalAmount })]);
      await connection.commit();
      return { id: result.insertId, patientId: visit.patientId, visitId: visit.id, serviceId: service.id, serviceName: service.name, serviceCode: service.code, quantity: input.quantity, unitPrice, totalAmount, status: "ADDED", notes: input.notes || null, bill, details };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  },
};
