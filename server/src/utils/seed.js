import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { database } from "../db/database.js";

const roles = [
  "SUPER_ADMIN",
  "RECEPTION",
  "LAB_ATTENDANT",
  "SURGERY_ATTENDANT",
  "BLOOD_BANK_STAFF",
  "BILLING_STAFF",
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
  "SURGERY_SERVICE_ADD",
  "SURGERY_VIEW",
  "SURGERY_SERVICE_VIEW",
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
];
const departmentPatientPermissions = ["PATIENT_VIEW", "PATIENT_SEARCH"];
const developmentUsers = [
  ["Reception", "Staff", "reception@hospital.local", "RECEPTION"],
  ["Lab", "Staff", "lab@hospital.local", "LAB_ATTENDANT"],
  ["Surgery", "Staff", "surgery@hospital.local", "SURGERY_ATTENDANT"],
  ["Blood Bank", "Staff", "bloodbank@hospital.local", "BLOOD_BANK_STAFF"],
  ["Billing", "Staff", "billing@hospital.local", "BILLING_STAFF"],
];

async function seed() {
  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    for (const name of roles)
      await connection.execute(
        "INSERT INTO roles (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)",
        [randomUUID(), name],
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
      roleRows.map((role) => [role.name, role.id]),
    );
    const permissionIds = Object.fromEntries(
      permissionRows.map((permission) => [permission.name, permission.id]),
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
    const email = env.SUPER_ADMIN_EMAIL.toLowerCase();
    const [users] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    const userId = users[0]?.id || randomUUID();
    if (!users.length)
      await connection.execute(
        "INSERT INTO users (id, first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?, ?)",
        [
          userId,
          "System",
          "Administrator",
          email,
          await bcrypt.hash(env.SUPER_ADMIN_PASSWORD, 12),
        ],
      );
    await connection.execute(
      "INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [userId, roleIds.SUPER_ADMIN],
    );
    for (const [firstName, lastName, devEmail, role] of developmentUsers) {
      const [existingUser] = await connection.execute(
        "SELECT id FROM users WHERE email = ?",
        [devEmail],
      );
      const devUserId = existingUser[0]?.id || randomUUID();
      if (!existingUser.length)
        await connection.execute(
          "INSERT INTO users (id, first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?, ?)",
          [
            devUserId,
            firstName,
            lastName,
            devEmail,
            await bcrypt.hash("DevPassword123!", 12),
          ],
        );
      await connection.execute(
        "INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)",
        [devUserId, roleIds[role]],
      );
    }
    await connection.commit();
    console.log("Roles, permissions, and Super Admin seed completed.");
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

seed()
  .catch((error) => {
    console.error("Database seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => database.end());
