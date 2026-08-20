import { database } from '../db/database.js';
import { AppError } from '../utils/app-error.js';

const select = `SELECT p.id, p.patient_number AS patientNumber, p.first_name AS firstName, p.last_name AS lastName, p.father_name AS fatherName, p.cnic, p.phone, p.address, p.registration_locked AS registrationLocked, p.is_active AS isActive, p.created_at AS createdAt, p.updated_at AS updatedAt, d.id AS doctorId, d.first_name AS doctorFirstName, d.last_name AS doctorLastName, d.specialization AS doctorSpecialization, u.id AS createdById, u.first_name AS createdByFirstName, u.last_name AS createdByLastName FROM patients p JOIN doctors d ON d.id = p.doctor_id JOIN users u ON u.id = p.created_by`;
const present = (row) => row && ({ ...row, registrationLocked: Boolean(row.registrationLocked), isActive: Boolean(row.isActive), doctor: { id: row.doctorId, firstName: row.doctorFirstName, lastName: row.doctorLastName, specialization: row.doctorSpecialization }, createdBy: { id: row.createdById, firstName: row.createdByFirstName, lastName: row.createdByLastName } });
const normalizeCnic = (value) => { const digits = value.replace(/\D/g, ''); if (!/^\d{13}$/.test(digits)) throw new AppError(400, 'CNIC must contain 13 digits'); return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`; };
const patientData = (patient) => ({ patientNumber: patient.patientNumber, firstName: patient.firstName, lastName: patient.lastName, fatherName: patient.fatherName, cnic: patient.cnic, phone: patient.phone, address: patient.address, doctorId: patient.doctor.id, isActive: patient.isActive });

async function getById(id, connection = database) { const [rows] = await connection.execute(`${select} WHERE p.id = ?`, [id]); if (!rows.length) throw new AppError(404, 'Patient not found'); return present(rows[0]); }
async function activeDoctor(id, connection) { const [rows] = await connection.execute('SELECT id FROM doctors WHERE id = ? AND is_active = TRUE', [id]); if (!rows.length) throw new AppError(400, 'Selected doctor was not found or is inactive'); }
async function registrationAudit(connection, patientId, userId, action, oldData, newData) { await connection.execute('INSERT INTO patient_registration_audit (patient_id, user_id, action, old_data, new_data) VALUES (?, ?, ?, ?, ?)', [patientId, userId, action, oldData ? JSON.stringify(oldData) : null, newData ? JSON.stringify(newData) : null]); }

export const patientService = {
  normalizeCnic,
  async create(data, actorId) {
    const cnic = normalizeCnic(data.cnic); const connection = await database.getConnection(); let locked = false;
    try {
      const [lockRows] = await connection.query("SELECT GET_LOCK('hms_patient_number', 10) AS locked"); locked = lockRows[0].locked === 1;
      if (!locked) throw new AppError(503, 'Unable to reserve a patient number. Please try again.');
      await connection.beginTransaction();
      await activeDoctor(data.doctorId, connection);
      const [duplicates] = await connection.execute('SELECT id FROM patients WHERE cnic = ? AND is_active = TRUE', [cnic]);
      if (duplicates.length) throw new AppError(409, 'Patient already registered.', [{ patientId: duplicates[0].id }]);
      const year = new Date().getFullYear(); const prefix = `PAT-${year}-`;
      const [latest] = await connection.execute('SELECT patient_number AS patientNumber FROM patients WHERE patient_number LIKE ? ORDER BY patient_number DESC LIMIT 1 FOR UPDATE', [`${prefix}%`]);
      const sequence = latest.length ? Number(latest[0].patientNumber.slice(-6)) + 1 : 1;
      const patientNumber = `${prefix}${String(sequence).padStart(6, '0')}`;
      const [result] = await connection.execute('INSERT INTO patients (patient_number, first_name, last_name, father_name, cnic, phone, address, doctor_id, created_by, registration_locked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)', [patientNumber, data.firstName, data.lastName, data.fatherName, cnic, data.phone, data.address, data.doctorId, actorId]);
      const patient = await getById(result.insertId, connection); await registrationAudit(connection, patient.id, actorId, 'CREATED', null, patientData(patient));
      await connection.commit(); return patient;
    } catch (error) { await connection.rollback(); throw error; } finally { if (locked) await connection.query("SELECT RELEASE_LOCK('hms_patient_number')"); connection.release(); }
  },
  async get(id) { return getById(id); },
  async list({ page, limit, search }) { const offset = (page - 1) * limit; const term = search ? `%${search.trim()}%` : null; const where = term ? 'WHERE p.patient_number LIKE ? OR p.cnic LIKE ? OR p.phone LIKE ? OR CONCAT(p.first_name, \' \', p.last_name) LIKE ?' : ''; const params = term ? [term, term, term, term] : []; const [rows] = await database.execute(`${select} ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]); const [counts] = await database.execute(`SELECT COUNT(*) AS total FROM patients p ${where}`, params); return { items: rows.map(present), page, limit, total: counts[0].total }; },
  async search(query) { const value = query.trim(); const cnic = value.replace(/\D/g, '').length === 13 ? normalizeCnic(value) : null; const [rows] = await database.execute(`${select} WHERE p.is_active = TRUE AND (p.cnic = ? OR p.patient_number = ? OR p.phone LIKE ? OR CONCAT(p.first_name, ' ', p.last_name) LIKE ?) ORDER BY p.created_at DESC LIMIT 50`, [cnic || value, value, `%${value}%`, `%${value}%`]); return rows.map(present); },
  async update(id, data, actorId) { const previous = await getById(id); const connection = await database.getConnection(); try { await connection.beginTransaction(); if (data.doctorId) await activeDoctor(data.doctorId, connection); const changes = { firstName: 'first_name', lastName: 'last_name', fatherName: 'father_name', cnic: 'cnic', phone: 'phone', address: 'address', doctorId: 'doctor_id' }; const entries = Object.entries(changes).filter(([key]) => key in data); const values = entries.map(([key]) => key === 'cnic' ? normalizeCnic(data[key]) : data[key]); if ('cnic' in data) { const [duplicate] = await connection.execute('SELECT id FROM patients WHERE cnic = ? AND is_active = TRUE AND id != ?', [values[entries.findIndex(([key]) => key === 'cnic')], id]); if (duplicate.length) throw new AppError(409, 'Patient already registered.'); } await connection.execute(`UPDATE patients SET ${entries.map(([, column]) => `${column} = ?`).join(', ')} WHERE id = ?`, [...values, id]); const patient = await getById(id, connection); await registrationAudit(connection, id, actorId, 'UPDATED', patientData(previous), patientData(patient)); await connection.commit(); return { previous, patient }; } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); } },
  async remove(id) { await getById(id); await database.execute('UPDATE patients SET is_active = FALSE WHERE id = ?', [id]); return this.get(id); },
};
