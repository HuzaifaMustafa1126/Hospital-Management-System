import { randomUUID } from 'node:crypto';
import { database } from '../db/database.js';

const accessQuery = `SELECT u.id, u.first_name AS firstName, u.last_name AS lastName, u.email, u.phone, u.password_hash AS passwordHash, u.is_active AS isActive, u.created_at AS createdAt, u.updated_at AS updatedAt, r.name AS roleName, p.name AS permissionName FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id LEFT JOIN role_permissions rp ON rp.role_id = r.id LEFT JOIN permissions p ON p.id = rp.permission_id`;

const hydrate = (rows) => {
  if (!rows.length) return null;
  const { roleName: _role, permissionName: _permission, ...user } = rows[0];
  const roles = new Map();
  for (const row of rows) {
    if (!row.roleName) continue;
    if (!roles.has(row.roleName)) roles.set(row.roleName, { role: { name: row.roleName, permissions: [] } });
    if (row.permissionName && !roles.get(row.roleName).role.permissions.some(({ permission }) => permission.name === row.permissionName)) roles.get(row.roleName).role.permissions.push({ permission: { name: row.permissionName } });
  }
  return { ...user, isActive: Boolean(user.isActive), userRoles: [...roles.values()] };
};

const find = async (where, params) => {
  const [rows] = await database.execute(`${accessQuery} WHERE ${where}`, params);
  return hydrate(rows);
};

export const userRepository = {
  findByEmail: (email) => find('u.email = ?', [email]),
  findById: (id) => find('u.id = ?', [id]),
  async list() {
    const [rows] = await database.execute(`${accessQuery} ORDER BY u.created_at DESC`);
    const users = new Map();
    for (const row of rows) { if (!users.has(row.id)) users.set(row.id, []); users.get(row.id).push(row); }
    return [...users.values()].map(hydrate);
  },
  async create({ firstName, lastName, email, phone, passwordHash, role }) {
    const connection = await database.getConnection(); const id = randomUUID();
    try {
      await connection.beginTransaction();
      await connection.execute('INSERT INTO users (id, first_name, last_name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?, ?)', [id, firstName, lastName, email, phone ?? null, passwordHash]);
      const [roles] = await connection.execute('SELECT id FROM roles WHERE name = ?', [role]);
      if (!roles.length) throw new Error(`Unknown role: ${role}`);
      await connection.execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [id, roles[0].id]); await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    return this.findById(id);
  },
  async update(id, data) {
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      const fields = { firstName: 'first_name', lastName: 'last_name', email: 'email', phone: 'phone' };
      const updates = Object.entries(fields).filter(([key]) => key in data).map(([key, column]) => [column, data[key] ?? null]);
      if (updates.length) await connection.execute(`UPDATE users SET ${updates.map(([column]) => `${column} = ?`).join(', ')} WHERE id = ?`, [...updates.map(([, value]) => value), id]);
      if (data.role) { const [roles] = await connection.execute('SELECT id FROM roles WHERE name = ?', [data.role]); if (!roles.length) throw new Error(`Unknown role: ${data.role}`); await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [id]); await connection.execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [id, roles[0].id]); }
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    return this.findById(id);
  },
  async status(id, isActive) { await database.execute('UPDATE users SET is_active = ? WHERE id = ?', [isActive, id]); return this.findById(id); },
};
