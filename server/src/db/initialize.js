import mysql from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

const roles = [
  ['SUPER_ADMIN', 'Full system administration access'], ['RECEPTION', 'Reception desk access'],
  ['LAB_ATTENDANT', 'Laboratory staff access'], ['SURGERY_STAFF', 'Surgery department staff access'],
  ['BLOOD_BANK_STAFF', 'Blood bank staff access'], ['BILLING_STAFF', 'Billing department staff access'],
];
const permissions = ['PATIENT_CREATE', 'PATIENT_VIEW', 'PATIENT_UPDATE', 'PATIENT_DELETE', 'PATIENT_SEARCH', 'LAB_SERVICE_ADD', 'SURGERY_SERVICE_ADD', 'BLOOD_SERVICE_ADD', 'BILL_CREATE', 'BILL_VIEW', 'BILL_PRINT', 'USER_CREATE', 'USER_VIEW', 'USER_UPDATE', 'USER_DELETE', 'AUDIT_LOG_VIEW'];
const receptionPermissions = ['PATIENT_CREATE', 'PATIENT_VIEW', 'PATIENT_SEARCH'];

const tableStatements = [
  `CREATE TABLE IF NOT EXISTS users (id VARCHAR(191) NOT NULL, first_name VARCHAR(191) NOT NULL, last_name VARCHAR(191) NOT NULL, email VARCHAR(191) NOT NULL, phone VARCHAR(191) NULL, password_hash VARCHAR(191) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), PRIMARY KEY (id), UNIQUE KEY users_email_key (email), KEY users_is_active_idx (is_active)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS roles (id VARCHAR(191) NOT NULL, name VARCHAR(191) NOT NULL, description VARCHAR(191) NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), PRIMARY KEY (id), UNIQUE KEY roles_name_key (name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS permissions (id VARCHAR(191) NOT NULL, name VARCHAR(191) NOT NULL, description VARCHAR(191) NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), PRIMARY KEY (id), UNIQUE KEY permissions_name_key (name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_roles (user_id VARCHAR(191) NOT NULL, role_id VARCHAR(191) NOT NULL, PRIMARY KEY (user_id, role_id), KEY user_roles_user_id_idx (user_id), KEY user_roles_role_id_idx (role_id), CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS role_permissions (role_id VARCHAR(191) NOT NULL, permission_id VARCHAR(191) NOT NULL, PRIMARY KEY (role_id, permission_id), KEY role_permissions_role_id_idx (role_id), KEY role_permissions_permission_id_idx (permission_id), CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS audit_logs (id VARCHAR(191) NOT NULL, user_id VARCHAR(191) NULL, action VARCHAR(191) NOT NULL, entity VARCHAR(191) NOT NULL, entity_id VARCHAR(191) NULL, old_data JSON NULL, new_data JSON NULL, ip_address VARCHAR(191) NULL, user_agent VARCHAR(500) NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (id), KEY audit_logs_user_id_idx (user_id), KEY audit_logs_action_idx (action), KEY audit_logs_created_at_idx (created_at), CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
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
    if (log) console.log('Tables verified.');
    await seedAccessControl(connection);
    if (log) { console.log('Roles verified.'); console.log('Permissions verified.'); console.log('Database initialization completed successfully.'); }
  } finally { await connection.end(); }
}

const isDirectExecution = process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url;
if (isDirectExecution) initializeDatabase({ log: true }).catch((error) => { console.error('Database initialization failed:', error.message); process.exitCode = 1; });
