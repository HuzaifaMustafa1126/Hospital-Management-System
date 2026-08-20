# Database

Database name: `hospital_management`. A direct MySQL Server installation is the only database prerequisite.

`database/schema.sql` creates the six Phase 1 tables: `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, and `audit_logs`. It is non-destructive and includes primary keys, foreign keys, indexes, and duplicate-preventing composite keys.

Run `schema.sql`, then `seed.sql` with a MySQL client. Configure `server/.env`, then run `npm run db:seed --workspace=server`; that application seed creates the Super Admin only when its required environment credentials are present and hashes its password with bcrypt.

The application uses mysql2 connection pooling and parameterized queries; no ORM is used. Future schema changes should be supplied as ordered SQL files in `database/`.
