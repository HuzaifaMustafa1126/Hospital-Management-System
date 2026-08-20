-- Roles, permissions, and mappings only. The application seed creates the Super Admin with bcrypt.
USE hospital_management;

INSERT INTO roles (id, name, created_at, updated_at) VALUES
  (UUID(), 'SUPER_ADMIN', NOW(3), NOW(3)), (UUID(), 'RECEPTION', NOW(3), NOW(3)),
  (UUID(), 'LAB_ATTENDANT', NOW(3), NOW(3)), (UUID(), 'SURGERY_STAFF', NOW(3), NOW(3)),
  (UUID(), 'BLOOD_BANK_STAFF', NOW(3), NOW(3)), (UUID(), 'BILLING_STAFF', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at);

INSERT INTO permissions (id, name, created_at, updated_at) VALUES
  (UUID(), 'PATIENT_CREATE', NOW(3), NOW(3)), (UUID(), 'PATIENT_VIEW', NOW(3), NOW(3)), (UUID(), 'PATIENT_UPDATE', NOW(3), NOW(3)), (UUID(), 'PATIENT_DELETE', NOW(3), NOW(3)), (UUID(), 'PATIENT_SEARCH', NOW(3), NOW(3)),
  (UUID(), 'LAB_SERVICE_ADD', NOW(3), NOW(3)), (UUID(), 'SURGERY_SERVICE_ADD', NOW(3), NOW(3)), (UUID(), 'BLOOD_SERVICE_ADD', NOW(3), NOW(3)),
  (UUID(), 'BILL_CREATE', NOW(3), NOW(3)), (UUID(), 'BILL_VIEW', NOW(3), NOW(3)), (UUID(), 'BILL_PRINT', NOW(3), NOW(3)),
  (UUID(), 'USER_CREATE', NOW(3), NOW(3)), (UUID(), 'USER_VIEW', NOW(3), NOW(3)), (UUID(), 'USER_UPDATE', NOW(3), NOW(3)), (UUID(), 'USER_DELETE', NOW(3), NOW(3)), (UUID(), 'AUDIT_LOG_VIEW', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'SUPER_ADMIN';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN ('PATIENT_CREATE', 'PATIENT_VIEW', 'PATIENT_SEARCH') WHERE r.name = 'RECEPTION';

-- Development doctors only. Patients are deliberately not seeded.
INSERT INTO doctors (first_name, last_name, specialization, license_number) VALUES
  ('Ahmed', 'Khan', 'General Medicine', 'DEV-DR-001'),
  ('Ali', 'Raza', 'Cardiology', 'DEV-DR-002'),
  ('Hassan', 'Malik', 'Surgery', 'DEV-DR-003'),
  ('Usman', 'Tariq', 'Pathology', 'DEV-DR-004')
ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), specialization = VALUES(specialization);
