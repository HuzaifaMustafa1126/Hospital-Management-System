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
    `SELECT v.patient_id AS patientId,
      COALESCE((SELECT amount FROM registration_payments WHERE visit_id=v.id LIMIT 1),0) AS visitFee,
      COALESCE((SELECT SUM(total_amount) FROM patient_services WHERE visit_id=v.id AND status<>'CANCELLED'),0) AS servicesTotal,
      COALESCE((SELECT SUM(amount) FROM registration_payments WHERE visit_id=v.id AND payment_status='PAID'),0)
      + COALESCE((SELECT SUM(amount) FROM bill_payments WHERE visit_id=v.id),0) AS amountPaid
     FROM patient_visits v WHERE v.id=?`,
    [visitId],
  );
  if (!rows.length) throw new AppError(404, "Visit not found.");
  const visitFee = Number(rows[0].visitFee);
  const servicesTotal = Number(rows[0].servicesTotal);
  const totalAmount = visitFee + servicesTotal;
  const amountPaid = Number(rows[0].amountPaid);
  const balanceDue = Math.max(0, Math.round((totalAmount - amountPaid) * 100) / 100);
  const paymentStatus = balanceDue === 0 ? "PAID" : amountPaid > 0 ? "PARTIALLY_PAID" : "UNPAID";
  const [result] = await connection.execute(
    `INSERT INTO visit_bills (visit_id,patient_id,visit_fee,services_total,total_amount,amount_paid,balance_due,payment_status,created_by)
     VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE visit_fee=VALUES(visit_fee),services_total=VALUES(services_total),total_amount=VALUES(total_amount),amount_paid=VALUES(amount_paid),balance_due=VALUES(balance_due),payment_status=VALUES(payment_status)`,
    [visitId, rows[0].patientId, visitFee, servicesTotal, totalAmount, amountPaid, balanceDue, paymentStatus, actorId],
  );
  const [bills] = await connection.execute("SELECT id,bill_number AS billNumber FROM visit_bills WHERE visit_id=?", [visitId]);
  const billNumber = bills[0].billNumber || `BILL-${new Date().getFullYear()}-${String(bills[0].id).padStart(6,"0")}`;
  if (!bills[0].billNumber) await connection.execute("UPDATE visit_bills SET bill_number=? WHERE id=?", [billNumber,bills[0].id]);
  return { id: bills[0].id, billNumber, visitFee, servicesTotal, grossTotal: totalAmount, amountPaid, balanceDue, paymentStatus, created: result.affectedRows === 1 };
}
