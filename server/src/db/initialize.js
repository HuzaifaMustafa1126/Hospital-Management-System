import mysql from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";

const roles = [
  ["SUPER_ADMIN", "Full system administration access"],
  ["RECEPTION", "Reception desk access"],
  ["LAB_ATTENDANT", "Laboratory staff access"],
  [
    "SURGERY_ATTENDANT",
    "Staff member responsible for managing surgery-related patient services.",
  ],
  ["BLOOD_BANK_STAFF", "Blood bank staff access"],
  ["BILLING_STAFF", "Billing department staff access"],
];
const permissions = [
  "PATIENT_CREATE",
  "PATIENT_VIEW",
  "PATIENT_UPDATE",
  "PATIENT_DELETE",
  "PATIENT_SEARCH",
  "LAB_SERVICE_ADD",
  "SURGERY_VIEW",
  "SURGERY_SERVICE_VIEW",
  "SURGERY_SERVICE_ADD",
  "SURGERY_PATIENT_SEARCH",
  "BLOOD_SERVICE_ADD",
  "BILL_CREATE",
  "BILL_VIEW",
  "BILL_PRINT",
  "USER_CREATE",
  "USER_VIEW",
  "USER_UPDATE",
  "USER_DELETE",
  "AUDIT_LOG_VIEW",
  "REGISTRATION_FEE_VIEW",
  "REGISTRATION_FEE_UPDATE",
  "REGISTRATION_FEE_COLLECT",
  "REGISTRATION_FEE_RECEIPT_VIEW",
  "REGISTRATION_FEE_RECEIPT_PRINT",
];
const receptionPermissions = [
  "PATIENT_CREATE",
  "PATIENT_VIEW",
  "PATIENT_SEARCH",
  "REGISTRATION_FEE_VIEW",
  "REGISTRATION_FEE_COLLECT",
  "REGISTRATION_FEE_RECEIPT_VIEW",
  "REGISTRATION_FEE_RECEIPT_PRINT",
];
const departmentPatientPermissions = ["PATIENT_VIEW", "PATIENT_SEARCH"];

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
  `CREATE TABLE IF NOT EXISTS registration_payments (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, patient_id BIGINT UNSIGNED NOT NULL, receipt_number VARCHAR(50) NOT NULL, amount DECIMAL(10,2) NOT NULL, fee_type ENUM('FREE','DISCOUNTED') NOT NULL DEFAULT 'DISCOUNTED', payment_method ENUM('CASH','CARD','BANK_TRANSFER','OTHER') NOT NULL, payment_status ENUM('PAID','PENDING','REFUNDED','CANCELLED') NOT NULL DEFAULT 'PAID', received_by VARCHAR(191) NOT NULL, paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY registration_payments_patient_unique (patient_id), UNIQUE KEY registration_payments_receipt_unique (receipt_number), KEY idx_registration_payments_paid_at (paid_at), CONSTRAINT registration_payments_patient_fkey FOREIGN KEY (patient_id) REFERENCES patients(id), CONSTRAINT registration_payments_received_by_fkey FOREIGN KEY (received_by) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS departments (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, name VARCHAR(150) NOT NULL, code VARCHAR(30) NOT NULL, description VARCHAR(500) NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_by VARCHAR(191) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY uq_departments_code (code), KEY idx_departments_active (is_active), CONSTRAINT departments_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS services (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, department_id BIGINT UNSIGNED NOT NULL, name VARCHAR(150) NOT NULL, code VARCHAR(50) NOT NULL, description VARCHAR(500) NULL, price DECIMAL(10,2) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_by VARCHAR(191) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY uq_services_code (code), KEY idx_services_department_active (department_id, is_active), CONSTRAINT services_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id), CONSTRAINT services_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS patient_services (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, patient_id BIGINT UNSIGNED NOT NULL, service_id BIGINT UNSIGNED NOT NULL, quantity INT UNSIGNED NOT NULL, unit_price DECIMAL(10,2) NOT NULL, total_amount DECIMAL(12,2) NOT NULL, notes VARCHAR(1000) NULL, status ENUM('ADDED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'ADDED', added_by VARCHAR(191) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), KEY idx_patient_services_patient_created (patient_id, created_at), KEY idx_patient_services_service (service_id), CONSTRAINT patient_services_patient_fkey FOREIGN KEY (patient_id) REFERENCES patients(id), CONSTRAINT patient_services_service_fkey FOREIGN KEY (service_id) REFERENCES services(id), CONSTRAINT patient_services_added_by_fkey FOREIGN KEY (added_by) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const databaseConfig = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
};

async function seedAccessControl(connection) {
  for (const [name, description] of roles)
    await connection.execute(
      "INSERT INTO roles (id, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description)",
      [randomUUID(), name, description],
    );
  for (const name of permissions)
    await connection.execute(
      "INSERT INTO permissions (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)",
      [randomUUID(), name],
    );
  const [roleRows] = await connection.execute("SELECT id, name FROM roles");
  const [permissionRows] = await connection.execute(
    "SELECT id, name FROM permissions",
  );
  const roleIds = Object.fromEntries(
    roleRows.map(({ id, name }) => [name, id]),
  );
  const permissionIds = Object.fromEntries(
    permissionRows.map(({ id, name }) => [name, id]),
  );
  for (const name of permissions)
    await connection.execute(
      "INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
      [roleIds.SUPER_ADMIN, permissionIds[name]],
    );
  for (const name of receptionPermissions)
    await connection.execute(
      "INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
      [roleIds.RECEPTION, permissionIds[name]],
    );
  for (const role of [
    "LAB_ATTENDANT",
    "SURGERY_ATTENDANT",
    "BLOOD_BANK_STAFF",
    "BILLING_STAFF",
  ])
    for (const name of departmentPatientPermissions)
      await connection.execute(
        "INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
        [roleIds[role], permissionIds[name]],
      );
  await connection.execute(
    "INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
    [roleIds.LAB_ATTENDANT, permissionIds.LAB_SERVICE_ADD],
  );
  for (const name of [
    "SURGERY_VIEW",
    "SURGERY_SERVICE_VIEW",
    "SURGERY_SERVICE_ADD",
    "SURGERY_PATIENT_SEARCH",
  ])
    await connection.execute(
      "INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
      [roleIds.SURGERY_ATTENDANT, permissionIds[name]],
    );
  await connection.execute(
    "DELETE rp FROM role_permissions rp JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id WHERE p.name = 'PATIENT_UPDATE' AND r.name <> 'SUPER_ADMIN'",
  );
  await connection.execute(
    "INSERT INTO settings (setting_key, setting_value) VALUES ('REGISTRATION_FEE', '500') ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key)",
  );
  const doctors = [
    ["Ahmed", "Khan", "General Medicine", "DEV-DR-001"],
    ["Ali", "Raza", "Cardiology", "DEV-DR-002"],
    ["Hassan", "Malik", "Surgery", "DEV-DR-003"],
    ["Usman", "Tariq", "Pathology", "DEV-DR-004"],
  ];
  for (const [firstName, lastName, specialization, licenseNumber] of doctors)
    await connection.execute(
      "INSERT INTO doctors (first_name, last_name, specialization, license_number) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), specialization = VALUES(specialization)",
      [firstName, lastName, specialization, licenseNumber],
    );
  const departments = [
    ["Laboratory", "LAB", "Laboratory diagnostic services"],
    ["Radiology", "RAD", "Diagnostic imaging services"],
    ["Surgery", "SUR", "Surgical services"],
    ["Blood Bank", "BB", "Blood bank services"],
    ["Pharmacy", "PHARM", "Pharmacy services"],
    ["Other Services", "OTHER", "Other hospital services"],
  ];
  for (const [name, code, description] of departments)
    await connection.execute(
      "INSERT INTO departments (name, code, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id = id",
      [name, code, description],
    );
  const [departmentRows] = await connection.execute(
    "SELECT id, code FROM departments",
  );
  const departmentIds = Object.fromEntries(
    departmentRows.map(({ id, code }) => [code, id]),
  );
  const services = [
    [
      "LAB",
      "Complete Blood Count",
      "LAB-CBC",
      "Complete blood count test",
      800,
    ],
    ["LAB", "Blood Sugar", "LAB-BS", "Blood sugar test", 300],
    ["LAB", "Liver Function Test", "LAB-LFT", "Liver function test", 1200],
    ["LAB", "Renal Function Test", "LAB-RFT", "Renal function test", 1200],
    [
      "LAB",
      "Urine Routine Examination",
      "LAB-URINE",
      "Urine routine examination",
      500,
    ],
    ["RAD", "X-Ray", "RAD-XRAY", "X-ray imaging service", 1500],
    ["RAD", "Ultrasound", "RAD-US", "Ultrasound imaging service", 2500],
    ["SUR", "Minor Surgery", "SUR-MINOR", "Minor surgical procedure", 15000],
    ["SUR", "Major Surgery", "SUR-MAJOR", "Major surgical procedure", 50000],
    ["BB", "Blood Group Test", "BB-GROUP", "Blood group test", 500],
    ["BB", "Cross Matching", "BB-CROSS", "Blood cross matching", 1000],
  ];
  for (const [departmentCode, name, code, description, price] of services)
    await connection.execute(
      "INSERT INTO services (department_id, name, code, description, price) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id",
      [departmentIds[departmentCode], name, code, description, price],
    );
}

export async function initializeDatabase({ log = false } = {}) {
  if (log) console.log("Initializing Hospital Management database...");
  const bootstrap = await mysql.createConnection(databaseConfig);
  try {
    if (log) console.log("MySQL server connected.");
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(env.DB_NAME)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await bootstrap.end();
  }
  if (log) console.log(`Database verified: ${env.DB_NAME}`);
  const connection = await mysql.createConnection({
    ...databaseConfig,
    database: env.DB_NAME,
  });
  try {
    if (log) console.log("Creating tables...");
    for (const statement of tableStatements) await connection.query(statement);
    await connection.query(
      "ALTER TABLE permissions MODIFY name VARCHAR(191) NOT NULL",
    );
    const [feeTypeColumn] = await connection.query(
      "SHOW COLUMNS FROM registration_payments LIKE 'fee_type'",
    );
    if (!feeTypeColumn.length)
      await connection.query(
        "ALTER TABLE registration_payments ADD COLUMN fee_type ENUM('FREE','DISCOUNTED') NOT NULL DEFAULT 'DISCOUNTED' AFTER amount",
      );
    await connection.query(
      `CREATE TABLE IF NOT EXISTS patient_visits (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, patient_id BIGINT UNSIGNED NOT NULL, visit_number INT UNSIGNED NOT NULL, visit_date DATE NOT NULL, doctor_id BIGINT UNSIGNED NULL, created_by VARCHAR(191) NULL, status ENUM('OPEN','COMPLETED','CANCELLED') NOT NULL DEFAULT 'OPEN', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY uq_patient_visits_number (patient_id, visit_number), KEY idx_patient_visits_patient_date (patient_id, visit_date), CONSTRAINT patient_visits_patient_fkey FOREIGN KEY (patient_id) REFERENCES patients(id), CONSTRAINT patient_visits_doctor_fkey FOREIGN KEY (doctor_id) REFERENCES doctors(id), CONSTRAINT patient_visits_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    const [serviceVisit] = await connection.query(
      "SHOW COLUMNS FROM patient_services LIKE 'visit_id'",
    );
    if (!serviceVisit.length)
      await connection.query(
        "ALTER TABLE patient_services ADD COLUMN visit_id BIGINT UNSIGNED NULL AFTER patient_id, ADD KEY idx_patient_services_visit (visit_id), ADD CONSTRAINT patient_services_visit_fkey FOREIGN KEY (visit_id) REFERENCES patient_visits(id)",
      );
    const [paymentVisit] = await connection.query(
      "SHOW COLUMNS FROM registration_payments LIKE 'visit_id'",
    );
    if (!paymentVisit.length) {
      await connection.query(
        "ALTER TABLE registration_payments ADD COLUMN visit_id BIGINT UNSIGNED NULL AFTER patient_id, ADD KEY idx_registration_payments_visit (visit_id), ADD CONSTRAINT registration_payments_visit_fkey FOREIGN KEY (visit_id) REFERENCES patient_visits(id)",
      );
      await connection.query(
        "ALTER TABLE registration_payments DROP INDEX registration_payments_patient_unique",
      );
      await connection.query(
        "ALTER TABLE registration_payments ADD UNIQUE KEY uq_registration_payments_visit (visit_id)",
      );
    }
    await connection.query(
      `INSERT IGNORE INTO patient_visits (patient_id, visit_number, visit_date, doctor_id, created_by) SELECT p.id, 1, DATE(p.created_at), p.doctor_id, p.created_by FROM patients p`,
    );
    await connection.query(
      `UPDATE patient_services ps JOIN patient_visits v ON v.patient_id=ps.patient_id AND v.visit_number=1 SET ps.visit_id=v.id WHERE ps.visit_id IS NULL`,
    );
    await connection.query(
      `UPDATE registration_payments rp JOIN patient_visits v ON v.patient_id=rp.patient_id AND v.visit_number=1 SET rp.visit_id=v.id WHERE rp.visit_id IS NULL`,
    );
    if (log) console.log("Tables verified.");
    await seedAccessControl(connection);
    if (log) {
      console.log("Roles verified.");
      console.log("Permissions verified.");
      console.log("Database initialization completed successfully.");
    }
  } finally {
    await connection.end();
  }
}

const isDirectExecution =
  process.argv[1] &&
  new URL(`file://${process.argv[1]}`).href === import.meta.url;
if (isDirectExecution)
  initializeDatabase({ log: true }).catch((error) => {
    console.error("Database initialization failed:", error.message);
    process.exitCode = 1;
  });
