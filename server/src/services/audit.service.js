import { randomUUID } from 'node:crypto';
import { database } from '../db/database.js';

const safeData = (data) => {
  if (!data) return null;
  const safe = { ...data };
  for (const key of ['password', 'passwordHash', 'password_hash', 'token']) delete safe[key];
  return safe;
};

export const auditService = {
  async record({ userId, action, entity, entityId, oldData, newData, ipAddress, userAgent }) {
    await database.execute(
      `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, old_data, new_data, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), userId || null, action, entity, entityId || null,
        oldData ? JSON.stringify(safeData(oldData)) : null,
        newData ? JSON.stringify(safeData(newData)) : null, ipAddress || null, userAgent || null],
    );
  },
  async list() {
    const [rows] = await database.execute(`SELECT a.id, a.action, a.entity, a.entity_id AS entityId,
      a.old_data AS oldData, a.new_data AS newData, a.ip_address AS ipAddress,
      a.user_agent AS userAgent, a.created_at AS createdAt, u.first_name AS userFirstName,
      u.last_name AS userLastName, u.email AS userEmail FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 200`);
    return rows.map(({ oldData, newData, userFirstName, userLastName, userEmail, ...log }) => ({
      ...log, oldData: typeof oldData === 'string' ? JSON.parse(oldData) : oldData,
      newData: typeof newData === 'string' ? JSON.parse(newData) : newData,
      user: userEmail ? { firstName: userFirstName, lastName: userLastName, email: userEmail } : null,
    }));
  },
};
