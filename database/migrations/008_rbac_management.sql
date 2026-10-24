-- Additive RBAC management metadata; existing IDs, assignments and password hashes are preserved.
ALTER TABLE users ADD COLUMN status ENUM('ACTIVE','INACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE' AFTER is_active;
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL AFTER status;
ALTER TABLE roles ADD COLUMN slug VARCHAR(191) NULL AFTER name;
ALTER TABLE roles ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT FALSE AFTER description;
ALTER TABLE roles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER is_system;
ALTER TABLE permissions ADD COLUMN display_name VARCHAR(191) NULL AFTER name;
ALTER TABLE permissions ADD COLUMN module VARCHAR(100) NOT NULL DEFAULT 'General' AFTER display_name;
ALTER TABLE permissions ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER description;
-- The runtime initializer checks columns before applying them and creates user_departments safely.
