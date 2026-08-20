-- Phase 2 patient registration. Safe on a fresh or existing Phase 1 database.
USE hospital_management;
-- Phase 1 used an ENUM for permissions; extend it without recreating the table.
ALTER TABLE permissions MODIFY name ENUM('PATIENT_CREATE','PATIENT_VIEW','PATIENT_UPDATE','PATIENT_DELETE','PATIENT_SEARCH','LAB_SERVICE_ADD','SURGERY_SERVICE_ADD','BLOOD_SERVICE_ADD','BILL_CREATE','BILL_VIEW','BILL_PRINT','USER_CREATE','USER_VIEW','USER_UPDATE','USER_DELETE','AUDIT_LOG_VIEW','REGISTRATION_FEE_VIEW','REGISTRATION_FEE_UPDATE','REGISTRATION_FEE_COLLECT','REGISTRATION_FEE_RECEIPT_VIEW','REGISTRATION_FEE_RECEIPT_PRINT') NOT NULL;
CREATE TABLE IF NOT EXISTS doctors (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL,
  specialization VARCHAR(150) NULL, phone VARCHAR(30) NULL, license_number VARCHAR(100) NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_doctors_license_number (license_number), KEY idx_doctors_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS patients (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, patient_number VARCHAR(20) NOT NULL, first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, father_name VARCHAR(100) NOT NULL, cnic VARCHAR(15) NOT NULL, phone VARCHAR(30) NOT NULL, address VARCHAR(500) NOT NULL, doctor_id BIGINT UNSIGNED NOT NULL, registration_locked BOOLEAN NOT NULL DEFAULT TRUE, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_by VARCHAR(191) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_patients_patient_number (patient_number), KEY idx_patients_cnic (cnic), KEY idx_patients_active_cnic (is_active, cnic), KEY idx_patients_doctor_id (doctor_id), KEY idx_patients_created_by (created_by),
  CONSTRAINT patients_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctors(id), CONSTRAINT patients_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS patient_registration_audit (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, patient_id BIGINT UNSIGNED NOT NULL, user_id VARCHAR(191) NOT NULL, action VARCHAR(30) NOT NULL, old_data JSON NULL, new_data JSON NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_patient_registration_audit_patient (patient_id), KEY idx_patient_registration_audit_user (user_id),
  CONSTRAINT patient_registration_audit_patient_fkey FOREIGN KEY (patient_id) REFERENCES patients(id), CONSTRAINT patient_registration_audit_user_fkey FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, setting_key VARCHAR(100) NOT NULL UNIQUE, setting_value TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO settings (setting_key, setting_value) VALUES ('REGISTRATION_FEE', '500') ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);
CREATE TABLE IF NOT EXISTS registration_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, patient_id BIGINT UNSIGNED NOT NULL UNIQUE, receipt_number VARCHAR(50) NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL, payment_method ENUM('CASH','CARD','BANK_TRANSFER','OTHER') NOT NULL,
  payment_status ENUM('PAID','PENDING','REFUNDED','CANCELLED') NOT NULL DEFAULT 'PAID', received_by VARCHAR(191) NOT NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id), FOREIGN KEY (received_by) REFERENCES users(id),
  INDEX idx_registration_payments_receipt (receipt_number), INDEX idx_registration_payments_paid_at (paid_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
