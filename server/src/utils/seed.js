import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { database } from '../db/database.js';

const roles = ['SUPER_ADMIN', 'RECEPTION', 'LAB_ATTENDANT', 'SURGERY_STAFF', 'BLOOD_BANK_STAFF', 'BILLING_STAFF'];
const permissions = ['PATIENT_CREATE', 'PATIENT_VIEW', 'PATIENT_UPDATE', 'PATIENT_DELETE', 'PATIENT_SEARCH', 'LAB_SERVICE_ADD', 'SURGERY_SERVICE_ADD', 'BLOOD_SERVICE_ADD', 'BILL_CREATE', 'BILL_VIEW', 'BILL_PRINT', 'USER_CREATE', 'USER_VIEW', 'USER_UPDATE', 'USER_DELETE', 'AUDIT_LOG_VIEW', 'REGISTRATION_FEE_VIEW', 'REGISTRATION_FEE_UPDATE', 'REGISTRATION_FEE_COLLECT', 'REGISTRATION_FEE_RECEIPT_VIEW', 'REGISTRATION_FEE_RECEIPT_PRINT'];
const receptionPermissions = ['PATIENT_CREATE', 'PATIENT_VIEW', 'PATIENT_SEARCH', 'REGISTRATION_FEE_VIEW', 'REGISTRATION_FEE_COLLECT', 'REGISTRATION_FEE_RECEIPT_VIEW', 'REGISTRATION_FEE_RECEIPT_PRINT'];
const departmentPatientPermissions = ['PATIENT_VIEW', 'PATIENT_SEARCH'];
const developmentUsers = [
  ['Reception', 'Staff', 'reception@hospital.local', 'RECEPTION'], ['Lab', 'Staff', 'lab@hospital.local', 'LAB_ATTENDANT'],
  ['Surgery', 'Staff', 'surgery@hospital.local', 'SURGERY_STAFF'], ['Blood Bank', 'Staff', 'bloodbank@hospital.local', 'BLOOD_BANK_STAFF'], ['Billing', 'Staff', 'billing@hospital.local', 'BILLING_STAFF'],
];

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
    for (const role of ['LAB_ATTENDANT', 'SURGERY_STAFF', 'BLOOD_BANK_STAFF', 'BILLING_STAFF']) for (const name of departmentPatientPermissions) await connection.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleIds[role], permissionIds[name]]);
    await connection.execute("DELETE rp FROM role_permissions rp JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id WHERE p.name = 'PATIENT_UPDATE' AND r.name <> 'SUPER_ADMIN'");
    await connection.execute("INSERT INTO settings (setting_key, setting_value) VALUES ('REGISTRATION_FEE', '500') ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key)");
    const email = env.SUPER_ADMIN_EMAIL.toLowerCase();
    const [users] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    const userId = users[0]?.id || randomUUID();
    if (!users.length) await connection.execute(
      'INSERT INTO users (id, first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?, ?)',
      [userId, 'System', 'Administrator', email, await bcrypt.hash(env.SUPER_ADMIN_PASSWORD, 12)],
    );
    await connection.execute('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleIds.SUPER_ADMIN]);
    for (const [firstName, lastName, devEmail, role] of developmentUsers) {
      const [existingUser] = await connection.execute('SELECT id FROM users WHERE email = ?', [devEmail]);
      const devUserId = existingUser[0]?.id || randomUUID();
      if (!existingUser.length) await connection.execute('INSERT INTO users (id, first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?, ?)', [devUserId, firstName, lastName, devEmail, await bcrypt.hash('DevPassword123!', 12)]);
      await connection.execute('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [devUserId, roleIds[role]]);
    }
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
