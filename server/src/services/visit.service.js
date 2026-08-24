import { database } from "../db/database.js";
import { AppError } from "../utils/app-error.js";
import { randomUUID } from "node:crypto";
const select = `SELECT v.id, v.patient_id AS patientId, v.visit_number AS visitNumber, v.visit_date AS visitDate, v.status, v.created_at AS createdAt, v.updated_at AS updatedAt, d.first_name AS doctorFirstName, d.last_name AS doctorLastName FROM patient_visits v LEFT JOIN doctors d ON d.id=v.doctor_id`;
const present = (row) => ({
  ...row,
  doctorName: row.doctorFirstName
    ? `Dr. ${row.doctorFirstName} ${row.doctorLastName}`
    : "—",
});
export const visitService = {
  async list(patientId) {
    const [rows] = await database.execute(
      `${select} WHERE v.patient_id=? ORDER BY v.visit_number DESC`,
      [patientId],
    );
    return rows.map(present);
  },
  async get(id) {
    const [rows] = await database.execute(`${select} WHERE v.id=?`, [id]);
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
  async create(patientId, actorId) {
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      const [patients] = await connection.execute(
        "SELECT id, doctor_id AS doctorId FROM patients WHERE id=? AND is_active=TRUE FOR UPDATE",
        [patientId],
      );
      if (!patients.length) throw new AppError(404, "Patient not found.");
      const [latest] = await connection.execute(
        "SELECT visit_number AS visitNumber FROM patient_visits WHERE patient_id=? ORDER BY visit_number DESC LIMIT 1 FOR UPDATE",
        [patientId],
      );
      const visitNumber = (latest[0]?.visitNumber || 0) + 1;
      const [result] = await connection.execute(
        "INSERT INTO patient_visits (patient_id, visit_number, visit_date, doctor_id, created_by, status) VALUES (?, ?, CURDATE(), ?, ?, 'OPEN')",
        [patientId, visitNumber, patients[0].doctorId, actorId],
      );
      await connection.execute(
        "INSERT INTO audit_logs (id,user_id,action,entity,entity_id,new_data) VALUES (?,?,'PATIENT_VISIT_CREATED','PATIENT_VISIT',?,?)",
        [
          randomUUID(),
          actorId,
          String(result.insertId),
          JSON.stringify({ patientId: Number(patientId), visitNumber }),
        ],
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
