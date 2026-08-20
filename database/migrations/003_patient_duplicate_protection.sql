-- Run the two preflight queries below first. If either returns rows, resolve those
-- records before continuing; this migration intentionally never modifies patient data.
USE hospital_management;

SELECT cnic, COUNT(*) AS duplicate_count FROM patients GROUP BY cnic HAVING COUNT(*) > 1;
SELECT phone, COUNT(*) AS duplicate_count FROM patients GROUP BY phone HAVING COUNT(*) > 1;

-- Apply only after both preflight queries return no rows.
ALTER TABLE patients ADD CONSTRAINT uq_patients_cnic UNIQUE (cnic);
ALTER TABLE patients ADD CONSTRAINT uq_patients_phone UNIQUE (phone);
