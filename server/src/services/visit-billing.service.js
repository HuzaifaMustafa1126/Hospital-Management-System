import { AppError } from "../utils/app-error.js";

export async function currentOpenVisit(connection, patientId) {
  const [visits] = await connection.execute(
    "SELECT id,visit_number AS visitNumber,visit_date AS visitDate,status FROM patient_visits WHERE patient_id=? AND status='OPEN' ORDER BY visit_number DESC LIMIT 1 FOR UPDATE",
    [patientId],
  );
  if (!visits.length)
    throw new AppError(409, "No active visit found for this patient. Create a new visit at Reception first.");
  return visits[0];
}

export async function recalculateVisitBill(connection, visitId, actorId) {
  const [rows] = await connection.execute(
    `SELECT v.patient_id AS patientId, COALESCE(rp.amount,0) AS visitFee,
      COALESCE(SUM(CASE WHEN ps.status <> 'CANCELLED' THEN ps.total_amount ELSE 0 END),0) AS servicesTotal
     FROM patient_visits v
     LEFT JOIN registration_payments rp ON rp.visit_id=v.id
     LEFT JOIN patient_services ps ON ps.visit_id=v.id
     WHERE v.id=? GROUP BY v.id,rp.id`,
    [visitId],
  );
  if (!rows.length) throw new AppError(404, "Visit not found.");
  const visitFee = Number(rows[0].visitFee);
  const servicesTotal = Number(rows[0].servicesTotal);
  const totalAmount = visitFee + servicesTotal;
  await connection.execute(
    `INSERT INTO visit_bills (visit_id,patient_id,visit_fee,services_total,total_amount,created_by)
     VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE visit_fee=VALUES(visit_fee),services_total=VALUES(services_total),total_amount=VALUES(total_amount)`,
    [visitId, rows[0].patientId, visitFee, servicesTotal, totalAmount, actorId],
  );
  return { visitFee, servicesTotal, totalAmount };
}
