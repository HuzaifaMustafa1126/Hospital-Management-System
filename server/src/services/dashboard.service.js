import { database } from '../db/database.js';

const patientSelect = `SELECT p.id, p.patient_number AS patientNumber, p.first_name AS firstName, p.last_name AS lastName, p.cnic, p.registration_locked AS registrationLocked, p.created_at AS createdAt, d.first_name AS doctorFirstName, d.last_name AS doctorLastName FROM patients p JOIN doctors d ON d.id = p.doctor_id WHERE p.is_active = TRUE`;
export const dashboardService = {
  async summary() {
    const [[patientCount], [todayCount], [doctorCount], [recent], [trend], [revenue], [activity]] = await Promise.all([
      database.execute('SELECT COUNT(*) AS total FROM patients WHERE is_active = TRUE'),
      database.execute('SELECT COUNT(*) AS total FROM patients WHERE is_active = TRUE AND DATE(created_at) = CURRENT_DATE'),
      database.execute('SELECT COUNT(*) AS total FROM doctors WHERE is_active = TRUE'),
      database.execute(`${patientSelect} ORDER BY p.created_at DESC LIMIT 5`),
      database.execute("SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS total FROM patients WHERE is_active = TRUE AND created_at >= CURDATE() - INTERVAL 6 DAY GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d') ORDER BY date"),
      database.execute("SELECT DATE_FORMAT(paid_at, '%Y-%m-%d') AS date, COALESCE(SUM(amount), 0) AS total FROM registration_payments WHERE payment_status = 'PAID' AND paid_at >= CURDATE() - INTERVAL 6 DAY GROUP BY DATE_FORMAT(paid_at, '%Y-%m-%d') ORDER BY date"),
      database.execute('SELECT action, entity, entity_id AS entityId, created_at AS createdAt FROM audit_logs ORDER BY created_at DESC LIMIT 5'),
    ]);
    const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (6 - index)); return date.toISOString().slice(0, 10); }); const totals = Object.fromEntries(trend.map((row) => [row.date, Number(row.total)])); const revenueTotals = Object.fromEntries(revenue.map((row) => [row.date, Number(row.total)]));
    return { totalPatients: patientCount[0].total, todayPatients: todayCount[0].total, activeDoctors: doctorCount[0].total, todayServices: 0, todayRevenue: 0, pendingPayments: 0, registrationTrend: days.map((date) => ({ date, registrations: totals[date] || 0, revenue: revenueTotals[date] || 0 })), departmentActivity: [{ department: 'Laboratory', activity: 0 }, { department: 'Surgery', activity: 0 }, { department: 'Blood Bank', activity: 0 }, { department: 'Other', activity: 0 }], recentActivity: activity.map((row) => ({ action: row.action, entity: row.entity, entityId: row.entityId, createdAt: row.createdAt })), recentPatients: recent.map((row) => ({ id: row.id, patientNumber: row.patientNumber, firstName: row.firstName, lastName: row.lastName, cnic: row.cnic, registrationLocked: Boolean(row.registrationLocked), doctorName: `Dr. ${row.doctorFirstName} ${row.doctorLastName}`, createdAt: row.createdAt })) };
  },
};
