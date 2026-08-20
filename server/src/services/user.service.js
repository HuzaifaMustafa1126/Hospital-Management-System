import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { database } from '../db/database.js';
import { AppError } from '../utils/app-error.js';

const listQuery = `
  SELECT u.id, u.first_name AS firstName, u.last_name AS lastName, u.email, u.phone,
         u.is_active AS isActive, u.created_at AS createdAt, u.updated_at AS updatedAt,
         r.name AS roleName
  FROM users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id`;

const toUsers = (rows) => {
  const users = new Map();
  for (const row of rows) {
    if (!users.has(row.id)) {
      users.set(row.id, {
        id: row.id, firstName: row.firstName, lastName: row.lastName, email: row.email,
        phone: row.phone, isActive: Boolean(row.isActive), createdAt: row.createdAt,
        updatedAt: row.updatedAt, roles: [], userRoles: [],
      });
    }
    if (row.roleName) {
      const user = users.get(row.id);
      user.roles.push(row.roleName);
      user.userRoles.push({ role: { name: row.roleName } });
    }
  }
  return [...users.values()];
};

const findById = async (id) => {
  const [rows] = await database.execute(`${listQuery} WHERE u.id = ?`, [id]);
  return toUsers(rows)[0] ?? null;
};

const roleId = async (connection, role) => {
  const [roles] = await connection.execute('SELECT id FROM roles WHERE name = ?', [role]);
  if (!roles.length) throw new AppError(400, 'Invalid role');
  return roles[0].id;
};

export const userService = {
  async list() {
    const [rows] = await database.execute(`${listQuery} ORDER BY u.created_at DESC`);
    return toUsers(rows);
  },

  async get(id) {
    const user = await findById(id);
    if (!user) throw new AppError(404, 'User not found');
    return user;
  },

  async create({ firstName, lastName, email, phone, password, role, isActive }) {
    const normalizedEmail = email.toLowerCase();
    const [existing] = await database.execute('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing.length) throw new AppError(409, 'User already exists.');

    const connection = await database.getConnection();
    const id = randomUUID();
    try {
      await connection.beginTransaction();
      await connection.execute(
        'INSERT INTO users (id, first_name, last_name, email, phone, password_hash, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, firstName, lastName, normalizedEmail, phone || null, await bcrypt.hash(password, 12), isActive],
      );
      await connection.execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [id, await roleId(connection, role)]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return this.get(id);
  },

  async update(id, data) {
    const previous = await this.get(id);
    if (data.email) {
      const [existing] = await database.execute('SELECT id FROM users WHERE email = ?', [data.email.toLowerCase()]);
      if (existing.length && existing[0].id !== id) throw new AppError(409, 'An account with this email already exists');
    }
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      const fields = { firstName: 'first_name', lastName: 'last_name', email: 'email', phone: 'phone' };
      const updates = Object.entries(fields).filter(([key]) => key in data);
      if (updates.length) {
        await connection.execute(
          `UPDATE users SET ${updates.map(([, column]) => `${column} = ?`).join(', ')} WHERE id = ?`,
          [...updates.map(([key]) => key === 'email' ? data[key].toLowerCase() : data[key] || null), id],
        );
      }
      if (data.role) {
        await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [id]);
        await connection.execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [id, await roleId(connection, data.role)]);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return { previous, user: await this.get(id) };
  },

  async setStatus(id, isActive, actorId) {
    if (!isActive && id === actorId) throw new AppError(400, 'You cannot deactivate your own account');
    const previous = await this.get(id);
    await database.execute('UPDATE users SET is_active = ? WHERE id = ?', [isActive, id]);
    return { previous, user: await this.get(id) };
  },
  async resetPassword(id, password) { await this.get(id); await database.execute('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(password, 12), id]); return this.get(id); },
};
