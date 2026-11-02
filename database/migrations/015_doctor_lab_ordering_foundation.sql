-- HMS Lab Module Step 5.1: Doctor Lab Ordering database foundation only.
--
-- Pre-execution gates:
--   1. Confirm DATABASE() = 'hospital_management'.
--   2. Confirm migrations 013 and 014 have produced all eight Lab Catalog tables.
--   3. Confirm lab_orders, lab_order_items, and lab_order_item_tests are absent.
--   4. Take and verify a current database backup.
--
-- This migration is additive. It does not create orders, charges, services,
-- bills, payments, permissions, or workflow records.

USE hospital_management;

CREATE TABLE lab_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_number VARCHAR(50) NOT NULL,
  patient_id BIGINT UNSIGNED NOT NULL,
  visit_id BIGINT UNSIGNED NOT NULL,
  ordered_by_doctor_id BIGINT UNSIGNED NOT NULL,
  created_by_user_id VARCHAR(191) NOT NULL,
  source_context ENUM('SERVICES','SHORT_STAY') NOT NULL,
  status ENUM(
    'ORDERED',
    'SAMPLE_PENDING',
    'SAMPLE_COLLECTED',
    'IN_PROCESS',
    'RESULT_READY',
    'VERIFIED',
    'COMPLETED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'ORDERED',
  clinical_notes VARCHAR(2000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lab_orders_order_number (order_number),
  KEY idx_lab_orders_visit_created (visit_id, created_at),
  KEY idx_lab_orders_patient_created (patient_id, created_at),
  KEY idx_lab_orders_doctor_status (ordered_by_doctor_id, status, created_at),
  KEY idx_lab_orders_status_created (status, created_at),
  KEY idx_lab_orders_created_by (created_by_user_id),
  CONSTRAINT lab_orders_patient_fkey
    FOREIGN KEY (patient_id) REFERENCES patients(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT lab_orders_visit_fkey
    FOREIGN KEY (visit_id) REFERENCES patient_visits(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT lab_orders_doctor_fkey
    FOREIGN KEY (ordered_by_doctor_id) REFERENCES doctors(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT lab_orders_created_by_fkey
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lab_order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lab_order_id BIGINT UNSIGNED NOT NULL,
  item_type ENUM('TEST','PROFILE','COMBINATION') NOT NULL,
  lab_test_id BIGINT UNSIGNED NULL,
  lab_profile_id BIGINT UNSIGNED NULL,
  lab_combination_id BIGINT UNSIGNED NULL,
  catalog_code_snapshot VARCHAR(50) NOT NULL,
  catalog_name_snapshot VARCHAR(150) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  pricing_status ENUM('PENDING','CONFIGURED') NOT NULL,
  list_price_snapshot DECIMAL(12,2) NULL,
  discount_snapshot DECIMAL(12,2) NULL,
  final_price_snapshot DECIMAL(12,2) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'PKR',
  source_price_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lab_order_item_test (lab_order_id, lab_test_id),
  UNIQUE KEY uq_lab_order_item_profile (lab_order_id, lab_profile_id),
  UNIQUE KEY uq_lab_order_item_combination (lab_order_id, lab_combination_id),
  KEY idx_lab_order_items_order_created (lab_order_id, created_at),
  KEY idx_lab_order_items_test (lab_test_id),
  KEY idx_lab_order_items_profile (lab_profile_id),
  KEY idx_lab_order_items_combination (lab_combination_id),
  KEY idx_lab_order_items_source_price (source_price_id),
  KEY idx_lab_order_items_pricing_status (pricing_status, created_at),
  CONSTRAINT chk_lab_order_item_reference CHECK (
    (item_type = 'TEST' AND lab_test_id IS NOT NULL AND lab_profile_id IS NULL AND lab_combination_id IS NULL)
    OR
    (item_type = 'PROFILE' AND lab_profile_id IS NOT NULL AND lab_test_id IS NULL AND lab_combination_id IS NULL)
    OR
    (item_type = 'COMBINATION' AND lab_combination_id IS NOT NULL AND lab_test_id IS NULL AND lab_profile_id IS NULL)
  ),
  CONSTRAINT chk_lab_order_item_quantity CHECK (quantity > 0),
  CONSTRAINT chk_lab_order_item_price_snapshot CHECK (
    (
      pricing_status = 'PENDING'
      AND list_price_snapshot IS NULL
      AND discount_snapshot IS NULL
      AND final_price_snapshot IS NULL
    )
    OR
    (
      pricing_status = 'CONFIGURED'
      AND list_price_snapshot IS NOT NULL
      AND list_price_snapshot >= 0.00
      AND discount_snapshot IS NOT NULL
      AND discount_snapshot >= 0.00
      AND discount_snapshot <= list_price_snapshot
      AND final_price_snapshot IS NOT NULL
      AND final_price_snapshot >= 0.00
      AND final_price_snapshot = list_price_snapshot - discount_snapshot
    )
  ),
  CONSTRAINT chk_lab_order_item_currency CHECK (currency = 'PKR'),
  CONSTRAINT lab_order_items_order_fkey
    FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT lab_order_items_test_fkey
    FOREIGN KEY (lab_test_id) REFERENCES lab_tests(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT lab_order_items_profile_fkey
    FOREIGN KEY (lab_profile_id) REFERENCES lab_profiles(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT lab_order_items_combination_fkey
    FOREIGN KEY (lab_combination_id) REFERENCES lab_combinations(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT lab_order_items_source_price_fkey
    FOREIGN KEY (source_price_id) REFERENCES lab_prices(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lab_order_item_tests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lab_order_item_id BIGINT UNSIGNED NOT NULL,
  lab_test_id BIGINT UNSIGNED NOT NULL,
  test_code_snapshot VARCHAR(50) NOT NULL,
  test_name_snapshot VARCHAR(150) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lab_order_item_component_test (lab_order_item_id, lab_test_id),
  UNIQUE KEY uq_lab_order_item_component_sort (lab_order_item_id, sort_order),
  KEY idx_lab_order_item_tests_test (lab_test_id, lab_order_item_id),
  CONSTRAINT lab_order_item_tests_item_fkey
    FOREIGN KEY (lab_order_item_id) REFERENCES lab_order_items(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT lab_order_item_tests_test_fkey
    FOREIGN KEY (lab_test_id) REFERENCES lab_tests(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
