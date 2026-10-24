-- Additive migration: existing ages remain NULL and historical visits are preserved.
ALTER TABLE patients ADD COLUMN age TINYINT UNSIGNED NULL AFTER gender;
ALTER TABLE patient_visits ADD COLUMN claimed_at DATETIME NULL AFTER status;
