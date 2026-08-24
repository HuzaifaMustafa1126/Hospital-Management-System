import { database } from "../db/database.js";

const patientSelect = `SELECT p.id, p.patient_number AS patientNumber, p.first_name AS firstName, p.last_name AS lastName, p.cnic, p.registration_locked AS registrationLocked, p.created_at AS createdAt, d.first_name AS doctorFirstName, d.last_name AS doctorLastName FROM patients p JOIN doctors d ON d.id = p.doctor_id WHERE p.is_active = TRUE`;
export const dashboardService = {
  async summary({ includeFinancial = false } = {}) {
    const [
      [patientCount],
      [todayCount],
      [doctorCount],
      [departmentCount],
      [activeServiceCount],
      [inactiveServiceCount],
      [surgeryToday],
      [bloodBankToday],
      [recent],
      [trend],
      [revenue],
      [financialTotals],
      [activity],
      [departmentActivity],
    ] = await Promise.all([
      database.execute(
        "SELECT COUNT(*) AS total FROM patients WHERE is_active = TRUE",
      ),
      database.execute(
        "SELECT COUNT(*) AS total FROM patients WHERE is_active = TRUE AND DATE(created_at) = CURRENT_DATE",
      ),
      database.execute(
        "SELECT COUNT(*) AS total FROM doctors WHERE is_active = TRUE",
      ),
      database.execute("SELECT COUNT(*) AS total FROM departments"),
      database.execute(
        "SELECT COUNT(*) AS total FROM services WHERE is_active = TRUE",
      ),
      database.execute(
        "SELECT COUNT(*) AS total FROM services WHERE is_active = FALSE",
      ),
      database.execute(
        "SELECT COUNT(*) AS total FROM patient_services ps JOIN services s ON s.id=ps.service_id JOIN departments d ON d.id=s.department_id WHERE d.code='SUR' AND DATE(ps.created_at)=CURDATE()",
      ),
      database.execute(
        "SELECT COUNT(*) AS total FROM patient_services ps JOIN services s ON s.id=ps.service_id JOIN departments d ON d.id=s.department_id WHERE d.code IN ('BB','BLOOD_BANK') AND DATE(ps.created_at)=CURDATE()",
      ),
      database.execute(`${patientSelect} ORDER BY p.created_at DESC LIMIT 5`),
      database.execute(
        "SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS total FROM patients WHERE is_active = TRUE AND created_at >= CURDATE() - INTERVAL 6 DAY GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d') ORDER BY date",
      ),
      includeFinancial ? database.execute(
        "SELECT date,SUM(total) total FROM (SELECT DATE_FORMAT(paid_at,'%Y-%m-%d') date,SUM(amount) total FROM registration_payments WHERE payment_status='PAID' AND paid_at>=CURDATE()-INTERVAL 6 DAY GROUP BY DATE_FORMAT(paid_at,'%Y-%m-%d') UNION ALL SELECT DATE_FORMAT(paid_at,'%Y-%m-%d'),SUM(amount) FROM bill_payments WHERE paid_at>=CURDATE()-INTERVAL 6 DAY GROUP BY DATE_FORMAT(paid_at,'%Y-%m-%d')) collected GROUP BY date ORDER BY date",
      ) : Promise.resolve([[]]),
      includeFinancial ? database.execute(
        `SELECT
          (SELECT COALESCE(SUM(amount),0) FROM registration_payments WHERE payment_status='PAID' AND DATE(paid_at)=CURDATE())+(SELECT COALESCE(SUM(amount),0) FROM bill_payments WHERE DATE(paid_at)=CURDATE()) AS todayRevenue,
          (SELECT COALESCE(SUM(total_amount),0) FROM visit_bills WHERE DATE(created_at)=CURDATE()) AS todayBilled,
          (SELECT COALESCE(SUM(balance_due),0) FROM visit_bills) AS outstandingBalance,
          (SELECT COUNT(*) FROM visit_bills WHERE payment_status='PAID') AS paidBills,
          (SELECT COUNT(*) FROM visit_bills WHERE payment_status='PARTIALLY_PAID') AS partiallyPaidBills,
          (SELECT COUNT(*) FROM visit_bills WHERE payment_status='UNPAID') AS unpaidBills,
          (SELECT COALESCE(SUM(amount),0) FROM registration_payments WHERE payment_status='PAID')+(SELECT COALESCE(SUM(amount),0) FROM bill_payments) AS collectedRevenue`,
      ) : Promise.resolve([[]]),
      database.execute(
        "SELECT action, entity, entity_id AS entityId, created_at AS createdAt FROM audit_logs ORDER BY created_at DESC LIMIT 5",
      ),
      database.execute(
        "SELECT d.name AS department, COUNT(s.id) AS activity FROM departments d LEFT JOIN services s ON s.department_id = d.id AND s.is_active = TRUE GROUP BY d.id, d.name ORDER BY d.name",
      ),
    ]);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date.toISOString().slice(0, 10);
    });
    const totals = Object.fromEntries(
      trend.map((row) => [row.date, Number(row.total)]),
    );
    const revenueTotals = Object.fromEntries(
      revenue.map((row) => [row.date, Number(row.total)]),
    );
    const result = {
      totalPatients: patientCount[0].total,
      todayPatients: todayCount[0].total,
      activeDoctors: doctorCount[0].total,
      totalDepartments: departmentCount[0].total,
      activeServices: activeServiceCount[0].total,
      inactiveServices: inactiveServiceCount[0].total,
      surgeryToday: Number(surgeryToday[0].total),
      bloodBankToday: Number(bloodBankToday[0].total),
      todayServices: 0,
      registrationTrend: days.map((date) => ({
        date,
        registrations: totals[date] || 0,
        ...(includeFinancial ? { revenue: revenueTotals[date] || 0 } : {}),
      })),
      departmentActivity: departmentActivity.map((row) => ({
        department: row.department,
        activity: Number(row.activity),
      })),
      recentActivity: activity.map((row) => ({
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        createdAt: row.createdAt,
      })),
      recentPatients: recent.map((row) => ({
        id: row.id,
        patientNumber: row.patientNumber,
        firstName: row.firstName,
        lastName: row.lastName,
        cnic: row.cnic,
        registrationLocked: Boolean(row.registrationLocked),
        doctorName: `Dr. ${row.doctorFirstName} ${row.doctorLastName}`,
        createdAt: row.createdAt,
      })),
    };
    if (includeFinancial) result.financial = {
      todayRevenue: Number(financialTotals[0]?.todayRevenue || 0),
      todayBilled: Number(financialTotals[0]?.todayBilled || 0),
      outstandingBalance: Number(financialTotals[0]?.outstandingBalance || 0),
      paidBills: Number(financialTotals[0]?.paidBills || 0),
      partiallyPaidBills: Number(financialTotals[0]?.partiallyPaidBills || 0),
      unpaidBills: Number(financialTotals[0]?.unpaidBills || 0),
      collectedRevenue: Number(financialTotals[0]?.collectedRevenue || 0),
      revenueTrend: days.map((date) => ({ date, revenue: revenueTotals[date] || 0 })),
    };
    return result;
  },
};
