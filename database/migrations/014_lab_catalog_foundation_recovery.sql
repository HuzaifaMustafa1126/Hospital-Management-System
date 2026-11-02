-- Lab Module Step 3.3: targeted recovery for the partially applied Migration 013.
--
-- Apply only to the verified development database state where:
--   - lab_categories, lab_tests, lab_test_parameters, lab_profiles,
--     lab_profile_tests, and lab_combinations already exist and are empty;
--   - lab_combination_items and lab_prices do not exist.
--
-- Migration 013 failed because MySQL rejects CHECK constraints that reference
-- columns participating in cascading foreign-key referential actions. This
-- recovery retains the approved CHECK constraints and uses ON UPDATE RESTRICT
-- for stable catalog identifiers.
--
-- This migration is intentionally not a clean-install replacement for 013.

USE hospital_management;

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
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT lab_combination_items_test_fkey
    FOREIGN KEY (lab_test_id) REFERENCES lab_tests(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT lab_combination_items_profile_fkey
    FOREIGN KEY (lab_profile_id) REFERENCES lab_profiles(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT
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
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT lab_prices_profile_fkey
    FOREIGN KEY (lab_profile_id) REFERENCES lab_profiles(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT lab_prices_combination_fkey
    FOREIGN KEY (lab_combination_id) REFERENCES lab_combinations(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
