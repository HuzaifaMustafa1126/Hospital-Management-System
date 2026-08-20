import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { database } from './database.js';

const roles = ['SUPER_ADMIN', 'RECEPTION', 'LAB_ATTENDANT', 'SURGERY_STAFF', 'BLOOD_BANK_STAFF', 'BILLING_STAFF'];
const permissions = ['PATIENT_CREATE', 'PATIENT_VIEW', 'PATIENT_UPDATE', 'PATIENT_DELETE', 'PATIENT_SEARCH', 'LAB_SERVICE_ADD', 'SURGERY_SERVICE_ADD', 'BLOOD_SERVICE_ADD', 'BILL_CREATE', 'BILL_VIEW', 'BILL_PRINT', 'USER_CREATE', 'USER_VIEW', 'USER_UPDATE', 'USER_DELETE', 'AUDIT_LOG_VIEW'];
const receptionPermissions = ['PATIENT_CREATE', 'PATIENT_VIEW', 'PATIENT_SEARCH'];

async function seed() {
  for (const name of roles) await database.execute('INSERT INTO roles (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)', [randomUUID(), name]);
  for (const name of permissions) await database.execute('INSERT INTO permissions (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)', [randomUUID(), name]);
  const [roleRows] = await database.execute('SELECT id, name FROM roles'); const [permissionRows] = await database.execute('SELECT id, name FROM permissions');
  const byRole = Object.fromEntries(roleRows.map((role) => [role.name, role.id])); const byPermission = Object.fromEntries(permissionRows.map((permission) => [permission.name, permission.id]));
  for (const name of permissions) await database.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [byRole.SUPER_ADMIN, byPermission[name]]);
  for (const name of receptionPermissions) await database.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [byRole.RECEPTION, byPermission[name]]);
  if (!env.SUPER_ADMIN_EMAIL || !env.SUPER_ADMIN_PASSWORD || env.SUPER_ADMIN_PASSWORD.length < 12) throw new Error('SUPER_ADMIN_EMAIL and a SUPER_ADMIN_PASSWORD of at least 12 characters are required to seed the Super Admin');
  const [users] = await database.execute('SELECT id FROM users WHERE email = ?', [env.SUPER_ADMIN_EMAIL]);
  const userId = users[0]?.id ?? randomUUID();
  if (!users.length) await database.execute('INSERT INTO users (id, first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?, ?)', [userId, 'System', 'Administrator', env.SUPER_ADMIN_EMAIL, await bcrypt.hash(env.SUPER_ADMIN_PASSWORD, 12)]);
  await database.execute('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, byRole.SUPER_ADMIN]);
  console.log('Roles, permissions, and Super Admin seed completed.');
}

seed().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => database.end());
