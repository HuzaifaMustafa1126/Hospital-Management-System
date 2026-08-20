import mysql from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

const roles = [
  ['SUPER_ADMIN', 'Full system administration access'], ['RECEPTION', 'Reception desk access'],
  ['LAB_ATTENDANT', 'Laboratory staff access'], ['SURGERY_STAFF', 'Surgery department staff access'],
  ['BLOOD_BANK_STAFF', 'Blood bank staff access'], ['BILLING_STAFF', 'Billing department staff access'],
];
const permissions = ['PATIENT_CREATE', 'PATIENT_VIEW', 'PATIENT_UPDATE', 'PATIENT_DELETE', 'PATIENT_SEARCH', 'LAB_SERVICE_ADD', 'SURGERY_SERVICE_ADD', 'BLOOD_SERVICE_ADD', 'BILL_CREATE', 'BILL_VIEW', 'BILL_PRINT', 'USER_CREATE', 'USER_VIEW', 'USER_UPDATE', 'USER_DELETE', 'AUDIT_LOG_VIEW', 'REGISTRATION_FEE_VIEW', 'REGISTRATION_FEE_UPDATE', 'REGISTRATION_FEE_COLLECT', 'REGISTRATION_FEE_RECEIPT_VIEW', 'REGISTRATION_FEE_RECEIPT_PRINT'];
const receptionPermissions = ['PATIENT_CREATE', 'PATIENT_VIEW', 'PATIENT_SEARCH', 'REGISTRATION_FEE_VIEW', 'REGISTRATION_FEE_COLLECT', 'REGISTRATION_FEE_RECEIPT_VIEW', 'REGISTRATION_FEE_RECEIPT_PRINT'];
const departmentPatientPermissions = ['PATIENT_VIEW', 'PATIENT_SEARCH'];

const tableStatements = [
  `CREATE TABLE IF NOT EXISTS users (id VARCHAR(191) NOT NULL, first_name VARCHAR(191) NOT NULL, last_name VARCHAR(191) NOT NULL, email VARCHAR(191) NOT NULL, phone VARCHAR(191) NULL, password_hash VARCHAR(191) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), PRIMARY KEY (id), UNIQUE KEY users_email_key (email), KEY users_is_active_idx (is_active)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS roles (id VARCHAR(191) NOT NULL, name VARCHAR(191) NOT NULL, description VARCHAR(191) NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), PRIMARY KEY (id), UNIQUE KEY roles_name_key (name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS permissions (id VARCHAR(191) NOT NULL, name VARCHAR(191) NOT NULL, description VARCHAR(191) NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), PRIMARY KEY (id), UNIQUE KEY permissions_name_key (name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_roles (user_id VARCHAR(191) NOT NULL, role_id VARCHAR(191) NOT NULL, PRIMARY KEY (user_id, role_id), KEY user_roles_user_id_idx (user_id), KEY user_roles_role_id_idx (role_id), CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS role_permissions (role_id VARCHAR(191) NOT NULL, permission_id VARCHAR(191) NOT NULL, PRIMARY KEY (role_id, permission_id), KEY role_permissions_role_id_idx (role_id), KEY role_permissions_permission_id_idx (permission_id), CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS audit_logs (id VARCHAR(191) NOT NULL, user_id VARCHAR(191) NULL, action VARCHAR(191) NOT NULL, entity VARCHAR(191) NOT NULL, entity_id VARCHAR(191) NULL, old_data JSON NULL, new_data JSON NULL, ip_address VARCHAR(191) NULL, user_agent VARCHAR(500) NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (id), KEY audit_logs_user_id_idx (user_id), KEY audit_logs_action_idx (action), KEY audit_logs_created_at_idx (created_at), CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS doctors (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, specialization VARCHAR(150) NULL, phone VARCHAR(30) NULL, license_number VARCHAR(100) NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY uq_doctors_license_number (license_number), KEY idx_doctors_active (is_active)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS patients (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, patient_number VARCHAR(20) NOT NULL, first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, father_name VARCHAR(100) NOT NULL, cnic VARCHAR(15) NOT NULL, phone VARCHAR(30) NOT NULL, address VARCHAR(500) NOT NULL, doctor_id BIGINT UNSIGNED NOT NULL, registration_locked BOOLEAN NOT NULL DEFAULT TRUE, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_by VARCHAR(191) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY uq_patients_patient_number (patient_number), KEY idx_patients_cnic (cnic), KEY idx_patients_active_cnic (is_active, cnic), KEY idx_patients_doctor_id (doctor_id), KEY idx_patients_created_by (created_by), CONSTRAINT patients_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctors(id), CONSTRAINT patients_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS patient_registration_audit (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, patient_id BIGINT UNSIGNED NOT NULL, user_id VARCHAR(191) NOT NULL, action VARCHAR(30) NOT NULL, old_data JSON NULL, new_data JSON NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id), KEY idx_patient_registration_audit_patient (patient_id), KEY idx_patient_registration_audit_user (user_id), CONSTRAINT patient_registration_audit_patient_fkey FOREIGN KEY (patient_id) REFERENCES patients(id), CONSTRAINT patient_registration_audit_user_fkey FOREIGN KEY (user_id) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS settings (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, setting_key VARCHAR(100) NOT NULL, setting_value TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY settings_key_unique (setting_key)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS registration_payments (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, patient_id BIGINT UNSIGNED NOT NULL, receipt_number VARCHAR(50) NOT NULL, amount DECIMAL(10,2) NOT NULL, payment_method ENUM('CASH','CARD','BANK_TRANSFER','OTHER') NOT NULL, payment_status ENUM('PAID','PENDING','REFUNDED','CANCELLED') NOT NULL DEFAULT 'PAID', received_by VARCHAR(191) NOT NULL, paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY registration_payments_patient_unique (patient_id), UNIQUE KEY registration_payments_receipt_unique (receipt_number), KEY idx_registration_payments_paid_at (paid_at), CONSTRAINT registration_payments_patient_fkey FOREIGN KEY (patient_id) REFERENCES patients(id), CONSTRAINT registration_payments_received_by_fkey FOREIGN KEY (received_by) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const databaseConfig = { host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER, password: env.DB_PASSWORD };

async function seedAccessControl(connection) {
  for (const [name, description] of roles) await connection.execute('INSERT INTO roles (id, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description)', [randomUUID(), name, description]);
  for (const name of permissions) await connection.execute('INSERT INTO permissions (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)', [randomUUID(), name]);
  const [roleRows] = await connection.execute('SELECT id, name FROM roles');
  const [permissionRows] = await connection.execute('SELECT id, name FROM permissions');
  const roleIds = Object.fromEntries(roleRows.map(({ id, name }) => [name, id]));
  const permissionIds = Object.fromEntries(permissionRows.map(({ id, name }) => [name, id]));
  for (const name of permissions) await connection.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleIds.SUPER_ADMIN, permissionIds[name]]);
  for (const name of receptionPermissions) await connection.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleIds.RECEPTION, permissionIds[name]]);
  for (const role of ['LAB_ATTENDANT', 'SURGERY_STAFF', 'BLOOD_BANK_STAFF', 'BILLING_STAFF']) for (const name of departmentPatientPermissions) await connection.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleIds[role], permissionIds[name]]);
  await connection.execute("DELETE rp FROM role_permissions rp JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id WHERE p.name = 'PATIENT_UPDATE' AND r.name <> 'SUPER_ADMIN'");
  await connection.execute("INSERT INTO settings (setting_key, setting_value) VALUES ('REGISTRATION_FEE', '500') ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key)");
  const doctors = [['Ahmed', 'Khan', 'General Medicine', 'DEV-DR-001'], ['Ali', 'Raza', 'Cardiology', 'DEV-DR-002'], ['Hassan', 'Malik', 'Surgery', 'DEV-DR-003'], ['Usman', 'Tariq', 'Pathology', 'DEV-DR-004']];
  for (const [firstName, lastName, specialization, licenseNumber] of doctors) await connection.execute('INSERT INTO doctors (first_name, last_name, specialization, license_number) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), specialization = VALUES(specialization)', [firstName, lastName, specialization, licenseNumber]);
}

export async function initializeDatabase({ log = false } = {}) {
  if (log) console.log('Initializing Hospital Management database...');
  const bootstrap = await mysql.createConnection(databaseConfig);
  try {
    if (log) console.log('MySQL server connected.');
    await bootstrap.query(`CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(env.DB_NAME)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally { await bootstrap.end(); }
  if (log) console.log(`Database verified: ${env.DB_NAME}`);
  const connection = await mysql.createConnection({ ...databaseConfig, database: env.DB_NAME });
  try {
    if (log) console.log('Creating tables...');
    for (const statement of tableStatements) await connection.query(statement);
    await connection.query("ALTER TABLE permissions MODIFY name VARCHAR(191) NOT NULL");
    if (log) console.log('Tables verified.');
    await seedAccessControl(connection);
    if (log) { console.log('Roles verified.'); console.log('Permissions verified.'); console.log('Database initialization completed successfully.'); }
  } finally { await connection.end(); }
}

const isDirectExecution = process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url;
if (isDirectExecution) initializeDatabase({ log: true }).catch((error) => { console.error('Database initialization failed:', error.message); process.exitCode = 1; });
