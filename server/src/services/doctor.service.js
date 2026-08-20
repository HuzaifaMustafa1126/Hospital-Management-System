import { database } from '../db/database.js';
import { AppError } from '../utils/app-error.js';

const columns = 'id, first_name AS firstName, last_name AS lastName, specialization, phone, license_number AS licenseNumber, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt';
const clean = (value) => value || null;
export const doctorService = {
  async list({ activeOnly = false } = {}) { const [rows] = await database.execute(`SELECT ${columns} FROM doctors ${activeOnly ? 'WHERE is_active = TRUE' : ''} ORDER BY first_name, last_name`); return rows.map((row) => ({ ...row, isActive: Boolean(row.isActive) })); },
  async get(id, { activeOnly = false } = {}) { const [rows] = await database.execute(`SELECT ${columns} FROM doctors WHERE id = ? ${activeOnly ? 'AND is_active = TRUE' : ''}`, [id]); if (!rows.length) throw new AppError(404, 'Doctor not found'); return { ...rows[0], isActive: Boolean(rows[0].isActive) }; },
  async create(data) { const [result] = await database.execute('INSERT INTO doctors (first_name, last_name, specialization, phone, license_number) VALUES (?, ?, ?, ?, ?)', [data.firstName, data.lastName, clean(data.specialization), clean(data.phone), clean(data.licenseNumber)]); return this.get(result.insertId); },
  async update(id, data) { await this.get(id); const fields = { firstName: 'first_name', lastName: 'last_name', specialization: 'specialization', phone: 'phone', licenseNumber: 'license_number' }; const changes = Object.entries(fields).filter(([key]) => key in data); await database.execute(`UPDATE doctors SET ${changes.map(([, column]) => `${column} = ?`).join(', ')} WHERE id = ?`, [...changes.map(([key]) => clean(data[key])), id]); return this.get(id); },
  async setStatus(id, isActive) { await this.get(id); await database.execute('UPDATE doctors SET is_active = ? WHERE id = ?', [isActive, id]); return this.get(id); },
};
