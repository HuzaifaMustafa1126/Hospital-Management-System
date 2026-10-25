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
  ["DOCTOR", "Doctor consultation and ordering access"],
];
const permissions = [
  "PATIENT_CREATE",
  "PATIENT_VIEW",
  "PATIENT_UPDATE",
  "PATIENT_DELETE",
  "PATIENT_SEARCH",
  "VISIT_CREATE",
  "VISIT_VIEW",
  "LAB_SERVICE_ADD",
  "SURGERY_VIEW",
  "SURGERY_SERVICE_VIEW",
  "SURGERY_SERVICE_ADD",
  "SURGERY_PATIENT_SEARCH",
  "BLOOD_SERVICE_ADD",
  "BLOOD_BANK_VIEW",
  "BLOOD_BANK_PATIENT_SEARCH",
  "BLOOD_BANK_SERVICE_VIEW",
  "BLOOD_BANK_SERVICE_ADD",
  "BILL_CREATE",
  "BILL_VIEW",
  "PAYMENT_CREATE",
  "PAYMENT_VIEW",
  "BILL_PRINT",
  "HOSPITAL_SETTINGS_VIEW",
  "HOSPITAL_SETTINGS_UPDATE",
  "USER_CREATE",
  "USER_VIEW",
  "USER_UPDATE",
  "USER_DELETE",
  "AUDIT_LOG_VIEW",
  "REVENUE_VIEW",
  "REGISTRATION_FEE_VIEW",
  "REGISTRATION_FEE_UPDATE",
  "REGISTRATION_FEE_COLLECT",
  "REGISTRATION_FEE_RECEIPT_VIEW",
  "REGISTRATION_FEE_RECEIPT_PRINT",
  "DOCTOR_QUEUE_VIEW",
  "VISIT_CLAIM",
  "VISIT_STATUS_UPDATE",
  "SHORT_STAY_ORDER_CREATE",
  "SHORT_STAY_ORDER_VIEW",
  "ROLE_VIEW",
  "ROLE_CREATE",
  "ROLE_UPDATE",
  "ROLE_DELETE",
  "PERMISSION_VIEW",
  "PERMISSION_ASSIGN",
  "USER_DEACTIVATE",
  "USER_DEPARTMENT_ASSIGN",
  "DEPARTMENT_VIEW",
  "DEPARTMENT_CREATE",
  "DEPARTMENT_UPDATE",
  "DEPARTMENT_DELETE",
  "DEPARTMENT_CHANGE_STATUS",
  "DEPARTMENT_MANAGE_FEES",
  "SERVICE_VIEW",
  "SERVICE_CREATE",
  "SERVICE_UPDATE",
  "SERVICE_DELETE",
  "SERVICE_CHANGE_STATUS",
  "SERVICE_MANAGE_PRICING",
  "SERVICE_ASSIGN_DEPARTMENTS",
];
const receptionPermissions = [
  "PATIENT_CREATE",
  "PATIENT_VIEW",
  "PATIENT_SEARCH",
  "VISIT_CREATE",
  "VISIT_VIEW",
  "REGISTRATION_FEE_VIEW",
  "REGISTRATION_FEE_COLLECT",
  "REGISTRATION_FEE_RECEIPT_VIEW",
  "REGISTRATION_FEE_RECEIPT_PRINT",
  "BILL_VIEW",
  "BILL_PRINT",
  "PAYMENT_CREATE",
  "PAYMENT_VIEW",
  "SERVICE_VIEW",
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
  `CREATE TABLE IF NOT EXISTS patients (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, patient_number VARCHAR(20) NOT NULL, first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, father_name VARCHAR(100) NOT NULL, gender ENUM('MALE','FEMALE') NOT NULL, cnic VARCHAR(15) NOT NULL, phone VARCHAR(30) NOT NULL, address VARCHAR(500) NOT NULL, doctor_id BIGINT UNSIGNED NOT NULL, registration_locked BOOLEAN NOT NULL DEFAULT TRUE, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_by VARCHAR(191) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY uq_patients_patient_number (patient_number), UNIQUE KEY uq_patients_cnic (cnic), UNIQUE KEY uq_patients_phone (phone), KEY idx_patients_active_cnic (is_active, cnic), KEY idx_patients_doctor_id (doctor_id), KEY idx_patients_created_by (created_by), CONSTRAINT patients_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctors(id), CONSTRAINT patients_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS patient_registration_audit (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, patient_id BIGINT UNSIGNED NOT NULL, user_id VARCHAR(191) NOT NULL, action VARCHAR(30) NOT NULL, old_data JSON NULL, new_data JSON NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id), KEY idx_patient_registration_audit_patient (patient_id), KEY idx_patient_registration_audit_user (user_id), CONSTRAINT patient_registration_audit_patient_fkey FOREIGN KEY (patient_id) REFERENCES patients(id), CONSTRAINT patient_registration_audit_user_fkey FOREIGN KEY (user_id) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS settings (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, setting_key VARCHAR(100) NOT NULL, setting_value TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY settings_key_unique (setting_key)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS registration_payments (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, patient_id BIGINT UNSIGNED NOT NULL, receipt_number VARCHAR(50) NOT NULL, amount DECIMAL(10,2) NOT NULL, fee_type ENUM('FREE','ACTUAL','DISCOUNTED') NOT NULL DEFAULT 'DISCOUNTED', payment_method ENUM('CASH','CARD','BANK_TRANSFER','OTHER') NOT NULL, payment_status ENUM('PAID','PENDING','REFUNDED','CANCELLED') NOT NULL DEFAULT 'PAID', received_by VARCHAR(191) NOT NULL, paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), KEY idx_registration_payments_patient (patient_id), UNIQUE KEY registration_payments_receipt_unique (receipt_number), KEY idx_registration_payments_paid_at (paid_at), CONSTRAINT registration_payments_patient_fkey FOREIGN KEY (patient_id) REFERENCES patients(id), CONSTRAINT registration_payments_received_by_fkey FOREIGN KEY (received_by) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
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
  await connection.execute(`UPDATE permissions SET display_name=COALESCE(display_name,CONCAT(UCASE(LEFT(REPLACE(name,'_',' '),1)),LCASE(SUBSTRING(REPLACE(name,'_',' '),2)))), module=CASE WHEN name LIKE 'PATIENT%' THEN 'Patients' WHEN name LIKE 'VISIT%' THEN 'Visits' WHEN name LIKE 'DOCTOR%' THEN 'Doctors' WHEN name LIKE 'SHORT_STAY%' THEN 'Short Stay' WHEN name LIKE 'BILL%' OR name LIKE 'PAYMENT%' OR name LIKE 'REVENUE%' OR name LIKE 'REGISTRATION_FEE%' THEN 'Billing' WHEN name LIKE 'USER%' THEN 'Users' WHEN name LIKE 'ROLE%' OR name LIKE 'PERMISSION%' THEN 'Roles & Permissions' WHEN name LIKE 'AUDIT%' THEN 'Audit' WHEN name LIKE 'HOSPITAL_SETTINGS%' THEN 'Settings' ELSE 'Clinical Services' END`);
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
  for (const role of ["RECEPTION","DOCTOR","LAB_ATTENDANT","SURGERY_ATTENDANT","BLOOD_BANK_STAFF","BILLING_STAFF"])
    await connection.execute("INSERT IGNORE INTO role_permissions(role_id,permission_id) VALUES(?,?)",[roleIds[role],permissionIds.DEPARTMENT_VIEW]);
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
  for (const name of ["PATIENT_VIEW","PATIENT_SEARCH","VISIT_VIEW","DOCTOR_QUEUE_VIEW","VISIT_CLAIM","VISIT_STATUS_UPDATE","SHORT_STAY_ORDER_CREATE","SHORT_STAY_ORDER_VIEW"])
    await connection.execute("INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [roleIds.DOCTOR, permissionIds[name]]);
  await connection.execute(
    "INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
    [roleIds.LAB_ATTENDANT, permissionIds.LAB_SERVICE_ADD],
  );
  for (const name of [
    "BLOOD_BANK_VIEW",
    "BLOOD_BANK_PATIENT_SEARCH",
    "BLOOD_BANK_SERVICE_VIEW",
    "BLOOD_BANK_SERVICE_ADD",
  ])
    await connection.execute(
      "INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
      [roleIds.BLOOD_BANK_STAFF, permissionIds[name]],
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
  const hospitalDefaults = {
    HOSPITAL_NAME: "Hospital Management System",
    HOSPITAL_SHORT_NAME: "HMS",
    HOSPITAL_LOGO: "",
    HOSPITAL_ADDRESS: "Sargodha, Punjab, Pakistan",
    HOSPITAL_PHONE: "+92 XXX XXXXXXX",
    HOSPITAL_ALTERNATE_PHONE: "",
    HOSPITAL_EMAIL: "info@hospital.local",
    HOSPITAL_WEBSITE: "",
    HOSPITAL_TAX_NUMBER: "",
    HOSPITAL_REGISTRATION_NUMBER: "",
    HOSPITAL_FOOTER:
      "Thank you for choosing our hospital. This is a computer-generated document and requires no signature.",
    HOSPITAL_CURRENCY: "PKR",
    HOSPITAL_INVOICE_PREFIX: "BILL",
    HOSPITAL_RECEIPT_PREFIX: "PAY",
  };
  for (const [key, value] of Object.entries(hospitalDefaults))
    await connection.execute(
      "INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)",
      [key, value],
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
  for (const [legacyCode, code, name, fee] of [
    ["GYNE", "GYNEA", "Gynea", 500],
    ["PEDS-OPD", "PEADS_OPD", "Peads-OPD", 600],
    ["GENERAL-OPD", "GENERAL_OPD", "General-OPD", 500],
  ]) {
    const [target] = await connection.execute("SELECT id FROM departments WHERE code=?", [code]);
    if (!target.length)
      await connection.execute("UPDATE departments SET code=?,name=?,registration_fee=?,accepts_registration=TRUE WHERE code=?", [code,name,fee,legacyCode]);
  }
  const registrationDepartments = [
    ["Emergency Category I", "EMERGENCY_CAT_1", "Emergency category I patient care", 500],
    ["Emergency Category II", "EMERGENCY_CAT_2", "Emergency category II patient care", 1000],
    ["Gynea", "GYNEA", "Gynecology outpatient care", 500],
    ["Eye", "EYE", "Ophthalmology outpatient care", 600],
    ["Dialysis", "DIALYSIS", "Dialysis services", 5000],
    ["Peads-OPD", "PEADS_OPD", "Pediatric outpatient care", 600],
    ["General-OPD", "GENERAL_OPD", "General outpatient care", 500],
  ];
  for (const [name, code, description, fee] of registrationDepartments)
    await connection.execute("INSERT INTO departments(name,code,description,registration_fee,is_active,accepts_registration) VALUES(?,?,?,?,TRUE,TRUE) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),registration_fee=VALUES(registration_fee),accepts_registration=TRUE", [name,code,description,fee]);
  await connection.execute("UPDATE departments SET is_active=FALSE,accepts_registration=FALSE WHERE code='EMERGENCY'");
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
    const [patientGenderColumn] = await connection.query(
      "SHOW COLUMNS FROM patients LIKE 'gender'",
    );
    if (!patientGenderColumn.length)
      await connection.query(
        "ALTER TABLE patients ADD COLUMN gender ENUM('MALE','FEMALE') NULL AFTER father_name",
      );
    const [patientAgeColumn] = await connection.query("SHOW COLUMNS FROM patients LIKE 'age'");
    if (!patientAgeColumn.length) await connection.query("ALTER TABLE patients ADD COLUMN age TINYINT UNSIGNED NULL AFTER gender");
    for (const [column, definition] of [
      ["record_classification", "ENUM('REAL','TEST') NOT NULL DEFAULT 'REAL' AFTER is_active"],
      ["classified_by", "VARCHAR(191) NULL AFTER record_classification"],
      ["classification_reason", "VARCHAR(1000) NULL AFTER classified_by"],
      ["classified_at", "DATETIME NULL AFTER classification_reason"],
    ]) {
      const [columns] = await connection.query(`SHOW COLUMNS FROM patients LIKE '${column}'`);
      if (!columns.length) await connection.query(`ALTER TABLE patients ADD COLUMN ${column} ${definition}`);
    }
    const [classificationIndex] = await connection.query("SHOW INDEX FROM patients WHERE Key_name='idx_patients_record_classification'");
    if (!classificationIndex.length) await connection.query("ALTER TABLE patients ADD KEY idx_patients_record_classification (record_classification)");
    const [classificationForeignKey] = await connection.execute("SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='patients_classified_by_fkey'");
    if (!classificationForeignKey.length) await connection.query("ALTER TABLE patients ADD CONSTRAINT patients_classified_by_fkey FOREIGN KEY (classified_by) REFERENCES users(id) ON DELETE SET NULL");
    const [patientCnicUnique] = await connection.query(
      "SHOW INDEX FROM patients WHERE Key_name='uq_patients_cnic'",
    );
    if (!patientCnicUnique.length)
      await connection.query(
        "ALTER TABLE patients ADD UNIQUE KEY uq_patients_cnic (cnic)",
      );
    const [patientPhoneUnique] = await connection.query(
      "SHOW INDEX FROM patients WHERE Key_name='uq_patients_phone'",
    );
    if (!patientPhoneUnique.length)
      await connection.query(
        "ALTER TABLE patients ADD UNIQUE KEY uq_patients_phone (phone)",
      );
    await connection.query(
      "ALTER TABLE permissions MODIFY name VARCHAR(191) NOT NULL",
    );
    for (const [column, definition] of [
      ["display_name", "VARCHAR(191) NULL AFTER name"],
      ["module", "VARCHAR(100) NOT NULL DEFAULT 'General' AFTER display_name"],
      ["is_active", "BOOLEAN NOT NULL DEFAULT TRUE AFTER description"],
    ]) { const [columns]=await connection.query(`SHOW COLUMNS FROM permissions LIKE '${column}'`); if(!columns.length) await connection.query(`ALTER TABLE permissions ADD COLUMN ${column} ${definition}`); }
    for (const [column, definition] of [
      ["slug", "VARCHAR(191) NULL AFTER name"],
      ["is_system", "BOOLEAN NOT NULL DEFAULT FALSE AFTER description"],
      ["is_active", "BOOLEAN NOT NULL DEFAULT TRUE AFTER is_system"],
    ]) { const [columns]=await connection.query(`SHOW COLUMNS FROM roles LIKE '${column}'`); if(!columns.length) await connection.query(`ALTER TABLE roles ADD COLUMN ${column} ${definition}`); }
    await connection.query("UPDATE roles SET slug=LOWER(REPLACE(name,'_','-')),is_system=TRUE WHERE slug IS NULL");
    const [roleSlugIndex]=await connection.query("SHOW INDEX FROM roles WHERE Key_name='uq_roles_slug'"); if(!roleSlugIndex.length) await connection.query("ALTER TABLE roles ADD UNIQUE KEY uq_roles_slug(slug)");
    for (const [column, definition] of [
      ["status", "ENUM('ACTIVE','INACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE' AFTER is_active"],
      ["deleted_at", "TIMESTAMP NULL AFTER status"],
    ]) { const [columns]=await connection.query(`SHOW COLUMNS FROM users LIKE '${column}'`); if(!columns.length) await connection.query(`ALTER TABLE users ADD COLUMN ${column} ${definition}`); }
    await connection.query(`CREATE TABLE IF NOT EXISTS user_departments (user_id VARCHAR(191) NOT NULL, department_id BIGINT UNSIGNED NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,department_id), KEY idx_user_departments_department(department_id,user_id), CONSTRAINT user_departments_user_fkey FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, CONSTRAINT user_departments_department_fkey FOREIGN KEY(department_id) REFERENCES departments(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    const [auditDetailsColumn] = await connection.query(
      "SHOW COLUMNS FROM audit_logs LIKE 'details'",
    );
    if (!auditDetailsColumn.length)
      await connection.query(
        "ALTER TABLE audit_logs ADD COLUMN details TEXT NULL AFTER entity_id",
      );
    const [feeTypeColumn] = await connection.query(
      "SHOW COLUMNS FROM registration_payments LIKE 'fee_type'",
    );
    if (!feeTypeColumn.length)
      await connection.query(
        "ALTER TABLE registration_payments ADD COLUMN fee_type ENUM('FREE','DISCOUNTED') NOT NULL DEFAULT 'DISCOUNTED' AFTER amount",
      );
    await connection.query(
      "ALTER TABLE registration_payments MODIFY fee_type ENUM('FREE','ACTUAL','DISCOUNTED') NOT NULL DEFAULT 'DISCOUNTED'",
    );
    await connection.query(
      `CREATE TABLE IF NOT EXISTS patient_visits (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, patient_id BIGINT UNSIGNED NOT NULL, visit_number INT UNSIGNED NOT NULL, visit_date DATE NOT NULL, doctor_id BIGINT UNSIGNED NULL, created_by VARCHAR(191) NULL, status ENUM('OPEN','COMPLETED','CANCELLED') NOT NULL DEFAULT 'OPEN', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY uq_patient_visits_number (patient_id, visit_number), KEY idx_patient_visits_patient_date (patient_id, visit_date), CONSTRAINT patient_visits_patient_fkey FOREIGN KEY (patient_id) REFERENCES patients(id), CONSTRAINT patient_visits_doctor_fkey FOREIGN KEY (doctor_id) REFERENCES doctors(id), CONSTRAINT patient_visits_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    for (const [column, definition] of [
      ["registration_fee", "DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER description"],
      ["deleted_at", "TIMESTAMP NULL AFTER is_active"],
      ["accepts_registration", "BOOLEAN NOT NULL DEFAULT FALSE AFTER registration_fee"],
    ]) {
      const [columns] = await connection.query(`SHOW COLUMNS FROM departments LIKE '${column}'`);
      if (!columns.length) await connection.query(`ALTER TABLE departments ADD COLUMN ${column} ${definition}`);
    }
    await connection.query("UPDATE departments SET registration_fee=COALESCE(NULLIF(registration_fee,0),(SELECT CAST(setting_value AS DECIMAL(10,2)) FROM settings WHERE setting_key='REGISTRATION_FEE' LIMIT 1),0)");
    const [patientDoctor] = await connection.query("SHOW COLUMNS FROM patients LIKE 'doctor_id'");
    if (patientDoctor[0]?.Null === "NO") await connection.query("ALTER TABLE patients MODIFY doctor_id BIGINT UNSIGNED NULL");
    const [visitDepartment] = await connection.query("SHOW COLUMNS FROM patient_visits LIKE 'department_id'");
    if (!visitDepartment.length) await connection.query("ALTER TABLE patient_visits ADD COLUMN department_id BIGINT UNSIGNED NULL AFTER patient_id, ADD KEY idx_patient_visits_department_status (department_id,status), ADD CONSTRAINT patient_visits_department_fkey FOREIGN KEY (department_id) REFERENCES departments(id)");
    const [visitFeeSnapshot] = await connection.query("SHOW COLUMNS FROM patient_visits LIKE 'registration_fee_snapshot'");
    if (!visitFeeSnapshot.length) await connection.query("ALTER TABLE patient_visits ADD COLUMN registration_fee_snapshot DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER doctor_id, ADD COLUMN fee_type ENUM('FREE','ACTUAL','DISCOUNTED') NOT NULL DEFAULT 'FREE' AFTER registration_fee_snapshot");
    await connection.query("ALTER TABLE patient_visits MODIFY status ENUM('OPEN','WAITING','IN_CONSULTATION','SHORT_STAY','COMPLETED','CANCELLED') NOT NULL DEFAULT 'WAITING'");
    const [claimedAtColumn]=await connection.query("SHOW COLUMNS FROM patient_visits LIKE 'claimed_at'");
    if(!claimedAtColumn.length) await connection.query("ALTER TABLE patient_visits ADD COLUMN claimed_at DATETIME NULL AFTER status");
    const [doctorUser] = await connection.query("SHOW COLUMNS FROM doctors LIKE 'user_id'");
    if (!doctorUser.length) await connection.query("ALTER TABLE doctors ADD COLUMN user_id VARCHAR(191) NULL AFTER id, ADD UNIQUE KEY uq_doctors_user (user_id), ADD CONSTRAINT doctors_user_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL");
    const [doctorAvailability] = await connection.query("SHOW COLUMNS FROM doctors LIKE 'availability'");
    if (!doctorAvailability.length) await connection.query("ALTER TABLE doctors ADD COLUMN availability ENUM('AVAILABLE','BUSY','OFF_DUTY','INACTIVE') NOT NULL DEFAULT 'AVAILABLE' AFTER specialization");
    await connection.query(`CREATE TABLE IF NOT EXISTS doctor_departments (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, doctor_id BIGINT UNSIGNED NOT NULL, department_id BIGINT UNSIGNED NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(id), UNIQUE KEY uq_doctor_department(doctor_id,department_id), KEY idx_doctor_departments_department(department_id,is_active), CONSTRAINT doctor_departments_doctor_fkey FOREIGN KEY(doctor_id) REFERENCES doctors(id), CONSTRAINT doctor_departments_department_fkey FOREIGN KEY(department_id) REFERENCES departments(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    for (const [column, definition] of [
      ["workflow_key", "VARCHAR(50) NOT NULL DEFAULT 'GENERIC' AFTER code"],
      ["doctor_selectable", "BOOLEAN NOT NULL DEFAULT FALSE AFTER workflow_key"],
    ]) {
      const [columns] = await connection.query(`SHOW COLUMNS FROM services LIKE '${column}'`);
      if (!columns.length) await connection.query(`ALTER TABLE services ADD COLUMN ${column} ${definition}`);
    }
    await connection.query(`CREATE TABLE IF NOT EXISTS department_services (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,department_id BIGINT UNSIGNED NOT NULL,service_id BIGINT UNSIGNED NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(id),UNIQUE KEY uq_department_service(department_id,service_id),KEY idx_department_services_service(service_id,department_id),CONSTRAINT department_services_department_fkey FOREIGN KEY(department_id) REFERENCES departments(id),CONSTRAINT department_services_service_fkey FOREIGN KEY(service_id) REFERENCES services(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    const [serviceDepartmentColumn] = await connection.query("SHOW COLUMNS FROM services LIKE 'department_id'");
    if (serviceDepartmentColumn[0]?.Null === "NO") await connection.query("ALTER TABLE services MODIFY department_id BIGINT UNSIGNED NULL");
    await connection.query("INSERT IGNORE INTO department_services(department_id,service_id) SELECT department_id,id FROM services");
    const [shortStayRows] = await connection.query("SELECT id FROM services WHERE code='SHORT_STAY'");
    let shortStayId = shortStayRows[0]?.id;
    if (!shortStayId) {
      const [departments] = await connection.query("SELECT id FROM departments WHERE is_active=TRUE AND deleted_at IS NULL ORDER BY id LIMIT 1");
      if (departments.length) {
        const [result] = await connection.execute("INSERT INTO services(department_id,name,code,workflow_key,doctor_selectable,description,price,is_active) VALUES(?,'Short Stay','SHORT_STAY','SHORT_STAY',TRUE,'Short-stay clinical orders with age-based pricing configured separately.',0,TRUE)", [departments[0].id]);
        shortStayId = result.insertId;
      }
    } else await connection.execute("UPDATE services SET workflow_key='SHORT_STAY',doctor_selectable=TRUE,is_active=TRUE WHERE id=?", [shortStayId]);
    if (shortStayId) await connection.execute("INSERT IGNORE INTO department_services(department_id,service_id) SELECT id,? FROM departments WHERE is_active=TRUE AND deleted_at IS NULL", [shortStayId]);
    await connection.query(`CREATE TABLE IF NOT EXISTS short_stay_orders (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, patient_id BIGINT UNSIGNED NOT NULL, visit_id BIGINT UNSIGNED NOT NULL, doctor_id BIGINT UNSIGNED NOT NULL, medicine_name VARCHAR(255) NOT NULL, dose VARCHAR(100) NOT NULL, route ENUM('IV','IM') NOT NULL, quantity VARCHAR(100) NOT NULL, status ENUM('ORDERED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'ORDERED', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(id), KEY idx_short_stay_visit_created(visit_id,created_at), CONSTRAINT short_stay_patient_fkey FOREIGN KEY(patient_id) REFERENCES patients(id), CONSTRAINT short_stay_visit_fkey FOREIGN KEY(visit_id) REFERENCES patient_visits(id), CONSTRAINT short_stay_doctor_fkey FOREIGN KEY(doctor_id) REFERENCES doctors(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await connection.query(
      `CREATE TABLE IF NOT EXISTS visit_bills (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, visit_id BIGINT UNSIGNED NOT NULL, patient_id BIGINT UNSIGNED NOT NULL, visit_fee DECIMAL(10,2) NOT NULL, services_total DECIMAL(12,2) NOT NULL, total_amount DECIMAL(12,2) NOT NULL, created_by VARCHAR(191) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY uq_visit_bills_visit (visit_id), KEY idx_visit_bills_patient (patient_id), CONSTRAINT visit_bills_visit_fkey FOREIGN KEY (visit_id) REFERENCES patient_visits(id), CONSTRAINT visit_bills_patient_fkey FOREIGN KEY (patient_id) REFERENCES patients(id), CONSTRAINT visit_bills_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    for (const [column, definition] of [
      ["bill_number", "VARCHAR(50) NULL AFTER id"],
      ["amount_paid", "DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER total_amount"],
      ["balance_due", "DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER amount_paid"],
      [
        "payment_status",
        "ENUM('UNPAID','PARTIALLY_PAID','PAID') NOT NULL DEFAULT 'UNPAID' AFTER balance_due",
      ],
    ]) {
      const [columns] = await connection.query(
        `SHOW COLUMNS FROM visit_bills LIKE '${column}'`,
      );
      if (!columns.length)
        await connection.query(
          `ALTER TABLE visit_bills ADD COLUMN ${column} ${definition}`,
        );
    }
    await connection.query(
      "UPDATE visit_bills SET bill_number=CONCAT('BILL-',YEAR(created_at),'-',LPAD(id,6,'0')) WHERE bill_number IS NULL",
    );
    await connection.query(`UPDATE visit_bills b
      LEFT JOIN (SELECT visit_id,SUM(amount) paid FROM registration_payments WHERE payment_status='PAID' GROUP BY visit_id) rp ON rp.visit_id=b.visit_id
      LEFT JOIN (SELECT visit_id,SUM(amount) paid FROM bill_payments GROUP BY visit_id) bp ON bp.visit_id=b.visit_id
      SET b.amount_paid=COALESCE(rp.paid,0)+COALESCE(bp.paid,0),
          b.balance_due=GREATEST(b.total_amount-(COALESCE(rp.paid,0)+COALESCE(bp.paid,0)),0),
          b.payment_status=CASE WHEN b.total_amount<=COALESCE(rp.paid,0)+COALESCE(bp.paid,0) THEN 'PAID' WHEN COALESCE(rp.paid,0)+COALESCE(bp.paid,0)>0 THEN 'PARTIALLY_PAID' ELSE 'UNPAID' END`);
    const [billNumberIndex] = await connection.query(
      "SHOW INDEX FROM visit_bills WHERE Key_name='uq_visit_bills_number'",
    );
    if (!billNumberIndex.length)
      await connection.query(
        "ALTER TABLE visit_bills ADD UNIQUE KEY uq_visit_bills_number (bill_number)",
      );
    await connection.query(
      `CREATE TABLE IF NOT EXISTS bill_payments (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, payment_number VARCHAR(50) NOT NULL, bill_id BIGINT UNSIGNED NOT NULL, patient_id BIGINT UNSIGNED NOT NULL, visit_id BIGINT UNSIGNED NOT NULL, amount DECIMAL(12,2) NOT NULL, payment_method ENUM('CASH','CARD','BANK_TRANSFER','OTHER') NOT NULL DEFAULT 'CASH', reference_number VARCHAR(100) NULL, notes VARCHAR(1000) NULL, received_by VARCHAR(191) NOT NULL, paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(id), UNIQUE KEY uq_bill_payments_number(payment_number), KEY idx_bill_payments_bill_paid(bill_id,paid_at), KEY idx_bill_payments_visit(visit_id), CONSTRAINT bill_payments_bill_fkey FOREIGN KEY(bill_id) REFERENCES visit_bills(id), CONSTRAINT bill_payments_patient_fkey FOREIGN KEY(patient_id) REFERENCES patients(id), CONSTRAINT bill_payments_visit_fkey FOREIGN KEY(visit_id) REFERENCES patient_visits(id), CONSTRAINT bill_payments_received_by_fkey FOREIGN KEY(received_by) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
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
    }
    const [paymentPatientIndex] = await connection.query(
      "SHOW INDEX FROM registration_payments WHERE Key_name='idx_registration_payments_patient'",
    );
    if (!paymentPatientIndex.length)
      await connection.query(
        "ALTER TABLE registration_payments ADD KEY idx_registration_payments_patient (patient_id)",
      );
    const [legacyPaymentPatientUnique] = await connection.query(
      "SHOW INDEX FROM registration_payments WHERE Key_name='registration_payments_patient_unique'",
    );
    if (legacyPaymentPatientUnique.length)
      await connection.query(
        "ALTER TABLE registration_payments DROP INDEX registration_payments_patient_unique",
      );
    const [paymentVisitUnique] = await connection.query(
      "SHOW INDEX FROM registration_payments WHERE Key_name='uq_registration_payments_visit'",
    );
    if (!paymentVisitUnique.length)
      await connection.query(
        "ALTER TABLE registration_payments ADD UNIQUE KEY uq_registration_payments_visit (visit_id)",
      );
    await connection.query(
      `INSERT IGNORE INTO patient_visits (patient_id, visit_number, visit_date, doctor_id, created_by) SELECT p.id, 1, DATE(p.created_at), p.doctor_id, p.created_by FROM patients p`,
    );
    await connection.query(
      `UPDATE patient_services ps JOIN patient_visits v ON v.patient_id=ps.patient_id AND v.visit_number=1 SET ps.visit_id=v.id WHERE ps.visit_id IS NULL`,
    );
    await connection.query(
      `UPDATE registration_payments rp JOIN patient_visits v ON v.patient_id=rp.patient_id AND v.visit_number=1 SET rp.visit_id=v.id WHERE rp.visit_id IS NULL`,
    );
    await connection.query(
      `INSERT IGNORE INTO visit_bills (visit_id, patient_id, visit_fee, services_total, total_amount, created_by) SELECT v.id, v.patient_id, COALESCE(rp.amount,0), COALESCE(SUM(ps.total_amount),0), COALESCE(rp.amount,0)+COALESCE(SUM(ps.total_amount),0), v.created_by FROM patient_visits v LEFT JOIN registration_payments rp ON rp.visit_id=v.id LEFT JOIN patient_services ps ON ps.visit_id=v.id GROUP BY v.id, rp.id`,
    );
    await connection.query(
      "UPDATE visit_bills SET bill_number=CONCAT('BILL-',YEAR(created_at),'-',LPAD(id,6,'0')) WHERE bill_number IS NULL",
    );
    if (log) console.log("Tables verified.");
    await seedAccessControl(connection);
    await connection.query(`INSERT INTO doctors (user_id,first_name,last_name,phone,availability,is_active)
      SELECT u.id,u.first_name,u.last_name,u.phone,IF(u.status='ACTIVE','AVAILABLE','INACTIVE'),u.status='ACTIVE'
      FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
      LEFT JOIN doctors d ON d.user_id=u.id
      WHERE r.name='DOCTOR' AND d.id IS NULL`);
    await connection.query(`INSERT INTO doctor_departments (doctor_id,department_id,is_active)
      SELECT d.id,ud.department_id,TRUE FROM doctors d JOIN user_departments ud ON ud.user_id=d.user_id
      ON DUPLICATE KEY UPDATE is_active=TRUE`);
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
