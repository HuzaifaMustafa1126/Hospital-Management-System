-- Lab Module Step 2: catalog and pricing foundation only.
--
-- Preflight requirements before execution:
--   1. Confirm DATABASE() = 'hospital_management'.
--   2. Confirm none of the eight tables below already exists. If any exists,
--      compare its full definition before proceeding; do not rely on
--      CREATE TABLE IF NOT EXISTS to establish compatibility.
--   3. Apply only after an explicit approval and a schema backup.
--
-- This migration is additive. It does not alter or populate existing HMS
-- tables and intentionally contains no clinical catalog seed data.

USE hospital_management;

CREATE TABLE lab_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lab_categories_code (code),
  KEY idx_lab_categories_active_sort (is_active, sort_order, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lab_tests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500) NULL,
  estimated_processing_seconds INT UNSIGNED NULL,
  is_orderable BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lab_tests_code (code),
  KEY idx_lab_tests_category_active (category_id, is_active, is_orderable, name),
  CONSTRAINT lab_tests_category_fkey
    FOREIGN KEY (category_id) REFERENCES lab_categories(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lab_test_parameters (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lab_test_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  unit VARCHAR(50) NULL,
  reference_range_text VARCHAR(500) NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lab_test_parameter_code (lab_test_id, code),
  KEY idx_lab_test_parameters_test_sort (lab_test_id, is_active, sort_order, name),
  CONSTRAINT lab_test_parameters_test_fkey
    FOREIGN KEY (lab_test_id) REFERENCES lab_tests(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lab_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500) NULL,
  estimated_processing_seconds INT UNSIGNED NULL,
  is_orderable BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lab_profiles_code (code),
  KEY idx_lab_profiles_active_orderable (is_active, is_orderable, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lab_profile_tests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lab_profile_id BIGINT UNSIGNED NOT NULL,
  lab_test_id BIGINT UNSIGNED NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lab_profile_test (lab_profile_id, lab_test_id),
  KEY idx_lab_profile_tests_test (lab_test_id, lab_profile_id),
  KEY idx_lab_profile_tests_sort (lab_profile_id, sort_order),
  CONSTRAINT lab_profile_tests_profile_fkey
    FOREIGN KEY (lab_profile_id) REFERENCES lab_profiles(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT lab_profile_tests_test_fkey
    FOREIGN KEY (lab_test_id) REFERENCES lab_tests(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lab_combinations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lab_combinations_code (code),
  KEY idx_lab_combinations_active (is_active, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lab_combination_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lab_combination_id BIGINT UNSIGNED NOT NULL,
  item_type ENUM('TEST','PROFILE') NOT NULL,
  lab_test_id BIGINT UNSIGNED NULL,
  lab_profile_id BIGINT UNSIGNED NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lab_combination_test (lab_combination_id, lab_test_id),
  UNIQUE KEY uq_lab_combination_profile (lab_combination_id, lab_profile_id),
  KEY idx_lab_combination_items_sort (lab_combination_id, sort_order),
  KEY idx_lab_combination_items_test (lab_test_id),
  KEY idx_lab_combination_items_profile (lab_profile_id),
  CONSTRAINT chk_lab_combination_item_reference CHECK (
    (item_type = 'TEST' AND lab_test_id IS NOT NULL AND lab_profile_id IS NULL)
    OR
    (item_type = 'PROFILE' AND lab_profile_id IS NOT NULL AND lab_test_id IS NULL)
  ),
  CONSTRAINT lab_combination_items_combination_fkey
    FOREIGN KEY (lab_combination_id) REFERENCES lab_combinations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT lab_combination_items_test_fkey
    FOREIGN KEY (lab_test_id) REFERENCES lab_tests(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT lab_combination_items_profile_fkey
    FOREIGN KEY (lab_profile_id) REFERENCES lab_profiles(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lab_prices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_type ENUM('TEST','PROFILE','COMBINATION') NOT NULL,
  lab_test_id BIGINT UNSIGNED NULL,
  lab_profile_id BIGINT UNSIGNED NULL,
  lab_combination_id BIGINT UNSIGNED NULL,
  price_amount DECIMAL(12,2) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'PKR',
  pricing_status ENUM('PENDING','CONFIGURED') NOT NULL DEFAULT 'PENDING',
  effective_from DATETIME NOT NULL,
  effective_to DATETIME NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lab_price_test_effective (lab_test_id, effective_from),
  UNIQUE KEY uq_lab_price_profile_effective (lab_profile_id, effective_from),
  UNIQUE KEY uq_lab_price_combination_effective (lab_combination_id, effective_from),
  KEY idx_lab_prices_test_lookup (lab_test_id, is_active, effective_from, effective_to),
  KEY idx_lab_prices_profile_lookup (lab_profile_id, is_active, effective_from, effective_to),
  KEY idx_lab_prices_combination_lookup (lab_combination_id, is_active, effective_from, effective_to),
  KEY idx_lab_prices_status (pricing_status, is_active),
  CONSTRAINT chk_lab_price_item_reference CHECK (
    (item_type = 'TEST' AND lab_test_id IS NOT NULL AND lab_profile_id IS NULL AND lab_combination_id IS NULL)
    OR
    (item_type = 'PROFILE' AND lab_profile_id IS NOT NULL AND lab_test_id IS NULL AND lab_combination_id IS NULL)
    OR
    (item_type = 'COMBINATION' AND lab_combination_id IS NOT NULL AND lab_test_id IS NULL AND lab_profile_id IS NULL)
  ),
  CONSTRAINT chk_lab_price_status_amount CHECK (
    (pricing_status = 'PENDING' AND price_amount IS NULL)
    OR
    (pricing_status = 'CONFIGURED' AND price_amount IS NOT NULL AND price_amount >= 0.00)
  ),
  CONSTRAINT chk_lab_price_effective_period CHECK (
    effective_to IS NULL OR effective_to > effective_from
  ),
  CONSTRAINT lab_prices_test_fkey
    FOREIGN KEY (lab_test_id) REFERENCES lab_tests(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT lab_prices_profile_fkey
    FOREIGN KEY (lab_profile_id) REFERENCES lab_profiles(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT lab_prices_combination_fkey
    FOREIGN KEY (lab_combination_id) REFERENCES lab_combinations(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
