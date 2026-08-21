CREATE TABLE IF NOT EXISTS patient_services (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  notes VARCHAR(1000) NULL,
  status ENUM('ADDED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'ADDED',
  added_by VARCHAR(191) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_patient_services_patient_created (patient_id, created_at),
  KEY idx_patient_services_service (service_id),
  CONSTRAINT patient_services_patient_fkey FOREIGN KEY (patient_id) REFERENCES patients(id),
  CONSTRAINT patient_services_service_fkey FOREIGN KEY (service_id) REFERENCES services(id),
  CONSTRAINT patient_services_added_by_fkey FOREIGN KEY (added_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
