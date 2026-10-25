ALTER TABLE services
  ADD COLUMN workflow_key VARCHAR(50) NOT NULL DEFAULT 'GENERIC' AFTER code,
  ADD COLUMN doctor_selectable BOOLEAN NOT NULL DEFAULT FALSE AFTER workflow_key;
ALTER TABLE services MODIFY department_id BIGINT UNSIGNED NULL;

CREATE TABLE IF NOT EXISTS department_services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  department_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_department_service (department_id, service_id),
  KEY idx_department_services_service (service_id, department_id),
  CONSTRAINT department_services_department_fkey FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT department_services_service_fkey FOREIGN KEY (service_id) REFERENCES services(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO department_services (department_id, service_id)
SELECT department_id, id FROM services;
