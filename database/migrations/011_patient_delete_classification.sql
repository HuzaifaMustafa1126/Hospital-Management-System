ALTER TABLE patients
  ADD COLUMN record_classification ENUM('REAL','TEST') NOT NULL DEFAULT 'REAL' AFTER is_active,
  ADD COLUMN classified_by VARCHAR(191) NULL AFTER record_classification,
  ADD COLUMN classification_reason VARCHAR(1000) NULL AFTER classified_by,
  ADD COLUMN classified_at DATETIME NULL AFTER classification_reason,
  ADD KEY idx_patients_record_classification (record_classification),
  ADD CONSTRAINT patients_classified_by_fkey
    FOREIGN KEY (classified_by) REFERENCES users(id) ON DELETE SET NULL;
