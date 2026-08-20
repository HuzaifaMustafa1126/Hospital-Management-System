import { database } from '../db/database.js';

const patientSelect = `SELECT p.id, p.patient_number AS patientNumber, p.first_name AS firstName, p.last_name AS lastName, p.created_at AS createdAt, d.first_name AS doctorFirstName, d.last_name AS doctorLastName FROM patients p JOIN doctors d ON d.id = p.doctor_id WHERE p.is_active = TRUE`;
export const dashboardService = {
  async summary() {
    const [[patientCount], [todayCount], [doctorCount], recent] = await Promise.all([
      database.execute('SELECT COUNT(*) AS total FROM patients WHERE is_active = TRUE'),
      database.execute('SELECT COUNT(*) AS total FROM patients WHERE is_active = TRUE AND DATE(created_at) = CURRENT_DATE'),
      database.execute('SELECT COUNT(*) AS total FROM doctors WHERE is_active = TRUE'),
      database.execute(`${patientSelect} ORDER BY p.created_at DESC LIMIT 5`),
    ]);
    return { totalPatients: patientCount[0].total, todayPatients: todayCount[0].total, activeDoctors: doctorCount[0].total, todayServices: 0, todayRevenue: 0, pendingPayments: 0, recentPatients: recent.map((row) => ({ id: row.id, patientNumber: row.patientNumber, firstName: row.firstName, lastName: row.lastName, doctorName: `Dr. ${row.doctorFirstName} ${row.doctorLastName}`, createdAt: row.createdAt })) };
  },
};
