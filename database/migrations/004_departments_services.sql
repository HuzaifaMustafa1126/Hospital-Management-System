-- Phase 3.1: Dynamic department and service configuration.
USE hospital_management;

CREATE TABLE IF NOT EXISTS departments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(150) NOT NULL, code VARCHAR(30) NOT NULL,
  description VARCHAR(500) NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_by VARCHAR(191) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_departments_code (code), KEY idx_departments_active (is_active),
  CONSTRAINT departments_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, department_id BIGINT UNSIGNED NOT NULL, name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NOT NULL, description VARCHAR(500) NULL, price DECIMAL(10,2) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(191) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_services_code (code), KEY idx_services_department_active (department_id, is_active),
  CONSTRAINT services_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT services_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
