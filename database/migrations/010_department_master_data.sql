-- Additive registration-department classification. Historical IDs are preserved.
ALTER TABLE departments ADD COLUMN accepts_registration BOOLEAN NOT NULL DEFAULT FALSE AFTER registration_fee;
-- Exact master records are applied idempotently by server/src/db/initialize.js.
