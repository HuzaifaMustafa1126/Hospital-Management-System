import { randomUUID } from 'node:crypto';
import { database } from '../db/database.js';

const safeData = (data) => {
  if (!data) return null;
  const safe = { ...data };
  for (const key of ['password', 'passwordHash', 'password_hash', 'token']) delete safe[key];
  return safe;
};

export const auditService = {
  async record({ userId, action, entity, entityId, details, oldData, newData, ipAddress, userAgent }) {
    let readableDetails = details;
    if (!readableDetails) {
      const [users] = userId ? await database.execute("SELECT CONCAT(first_name,' ',last_name) AS name FROM users WHERE id=?", [userId]) : [[]];
      const person = users[0]?.name || "System";
      if (action === "LOGIN") readableDetails = `${person} logged into the system.`;
      else if (action === "LOGOUT") readableDetails = `${person} logged out of the system.`;
      else if (action === "PATIENT_UPDATED" && newData) readableDetails = `${person} updated the registration information for ${newData.firstName} ${newData.lastName} (${newData.patientNumber}).`;
      else if (action === "SERVICE_CREATED" && newData) readableDetails = `${person} created the service ${newData.name} (${newData.code}) with a price of PKR ${Number(newData.price).toLocaleString("en-PK")}.`;
      else if (action === "SERVICE_PRICE_CHANGED" && oldData && newData) readableDetails = `${person} changed ${newData.name} (${newData.code}) price from PKR ${Number(oldData.price).toLocaleString("en-PK")} to PKR ${Number(newData.price).toLocaleString("en-PK")}.`;
      else if (action === "SERVICE_UPDATED" && newData) readableDetails = `${person} updated ${newData.name} (${newData.code}).`;
      else readableDetails = `${person} performed ${action.replaceAll("_", " ").toLowerCase()} on ${(entity || "record").replaceAll("_", " ").toLowerCase()}${entityId ? ` #${entityId}` : ""}.`;
    }
    await database.execute(
      `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details, old_data, new_data, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), userId || null, action, entity, entityId || null, readableDetails,
        oldData ? JSON.stringify(safeData(oldData)) : null,
        newData ? JSON.stringify(safeData(newData)) : null, ipAddress || null, userAgent || null],
    );
  },
  async list({ range = '30d', user = '', action = '', entity = '', search = '' } = {}) {
    const ranges = { today: 0, '7d': 6, '30d': 29 };
    const days = ranges[range] ?? 29;
    const clauses = ['a.created_at >= CURDATE() - INTERVAL ? DAY', 'a.created_at < CURDATE() + INTERVAL 1 DAY'];
    const params = [days];
    if (user) { clauses.push('a.user_id = ?'); params.push(user); }
    if (action) { clauses.push('a.action = ?'); params.push(action); }
    if (entity) { clauses.push('a.entity = ?'); params.push(entity); }
    if (search) { clauses.push("(a.action LIKE ? OR a.entity LIKE ? OR a.entity_id LIKE ? OR a.details LIKE ? OR CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) LIKE ?)"); const term = `%${search}%`; params.push(term, term, term, term, term); }
    const where = clauses.join(' AND ');
    const [[totals], [rows]] = await Promise.all([
      database.execute(`SELECT COUNT(*) total, SUM(DATE(a.created_at) = CURDATE()) today, SUM(a.action IN ('LOGIN','LOGOUT')) login, SUM(a.entity = 'PATIENT') patient, SUM(a.entity IN ('SERVICE','PATIENT_SERVICE')) service FROM audit_logs a WHERE ${where}`, params),
      database.execute(`SELECT a.id, a.action, a.entity, a.entity_id AS entityId, a.details,
      a.ip_address AS ipAddress,
      a.user_agent AS userAgent, a.created_at AS createdAt, u.first_name AS userFirstName,
      u.last_name AS userLastName, u.email AS userEmail, GROUP_CONCAT(r.name SEPARATOR ', ') AS roles FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id
      WHERE ${where} GROUP BY a.id ORDER BY a.created_at DESC LIMIT 200`, params),
    ]);
    return { stats: { total: Number(totals[0].total), today: Number(totals[0].today || 0), login: Number(totals[0].login || 0), patient: Number(totals[0].patient || 0), service: Number(totals[0].service || 0) }, logs: rows.map(({ userFirstName, userLastName, userEmail, roles, ...log }) => ({
      ...log,
      details: log.details || `${userEmail ? `${userFirstName} ${userLastName}` : "System"} performed ${log.action.replaceAll("_", " ").toLowerCase()} on ${log.entity.replaceAll("_", " ").toLowerCase()}${log.entityId ? ` #${log.entityId}` : ""}.`,
      user: userEmail ? { firstName: userFirstName, lastName: userLastName, email: userEmail, role: roles || 'User' } : null,
    })) };
  },
};
