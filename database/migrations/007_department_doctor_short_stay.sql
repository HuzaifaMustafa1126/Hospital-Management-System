-- Additive workflow migration. Existing patient, visit, service, bill and payment rows are preserved.
ALTER TABLE departments ADD COLUMN registration_fee DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER description;
ALTER TABLE departments ADD COLUMN deleted_at TIMESTAMP NULL AFTER is_active;
ALTER TABLE patients MODIFY doctor_id BIGINT UNSIGNED NULL;
ALTER TABLE patient_visits ADD COLUMN department_id BIGINT UNSIGNED NULL AFTER patient_id;
ALTER TABLE patient_visits ADD COLUMN registration_fee_snapshot DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER doctor_id;
ALTER TABLE patient_visits ADD COLUMN fee_type ENUM('FREE','ACTUAL','DISCOUNTED') NOT NULL DEFAULT 'FREE' AFTER registration_fee_snapshot;
ALTER TABLE patient_visits MODIFY status ENUM('OPEN','WAITING','IN_CONSULTATION','SHORT_STAY','COMPLETED','CANCELLED') NOT NULL DEFAULT 'WAITING';
-- Runtime initializer safely checks each addition and creates doctor_departments and short_stay_orders.
