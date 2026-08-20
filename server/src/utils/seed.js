import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { database } from '../db/database.js';

const roles = ['SUPER_ADMIN', 'RECEPTION', 'LAB_ATTENDANT', 'SURGERY_STAFF', 'BLOOD_BANK_STAFF', 'BILLING_STAFF'];
const permissions = ['PATIENT_CREATE', 'PATIENT_VIEW', 'PATIENT_UPDATE', 'PATIENT_DELETE', 'PATIENT_SEARCH', 'LAB_SERVICE_ADD', 'SURGERY_SERVICE_ADD', 'BLOOD_SERVICE_ADD', 'BILL_CREATE', 'BILL_VIEW', 'BILL_PRINT', 'USER_CREATE', 'USER_VIEW', 'USER_UPDATE', 'USER_DELETE', 'AUDIT_LOG_VIEW'];
const receptionPermissions = ['PATIENT_CREATE', 'PATIENT_VIEW', 'PATIENT_SEARCH'];

async function seed() {
  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    for (const name of roles) await connection.execute('INSERT INTO roles (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)', [randomUUID(), name]);
    for (const name of permissions) await connection.execute('INSERT INTO permissions (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)', [randomUUID(), name]);
    const [roleRows] = await connection.execute('SELECT id, name FROM roles');
    const [permissionRows] = await connection.execute('SELECT id, name FROM permissions');
    const roleIds = Object.fromEntries(roleRows.map((role) => [role.name, role.id]));
    const permissionIds = Object.fromEntries(permissionRows.map((permission) => [permission.name, permission.id]));
    for (const name of permissions) await connection.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleIds.SUPER_ADMIN, permissionIds[name]]);
    for (const name of receptionPermissions) await connection.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleIds.RECEPTION, permissionIds[name]]);
    const email = env.SUPER_ADMIN_EMAIL.toLowerCase();
    const [users] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    const userId = users[0]?.id || randomUUID();
    if (!users.length) await connection.execute(
      'INSERT INTO users (id, first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?, ?)',
      [userId, 'System', 'Administrator', email, await bcrypt.hash(env.SUPER_ADMIN_PASSWORD, 12)],
    );
    await connection.execute('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleIds.SUPER_ADMIN]);
    await connection.commit();
    console.log('Roles, permissions, and Super Admin seed completed.');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

seed().catch((error) => {
  console.error('Database seed failed:', error.message);
  process.exitCode = 1;
}).finally(() => database.end());
