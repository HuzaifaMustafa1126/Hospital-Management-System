# Database reference

## Database name and engine

`hospital_management` on MySQL.

## Current Phase 1 tables

`users`, `roles`, `permissions`, `user_roles`, `role_permissions`, and `audit_logs` only. No patient or future-module tables are included.

## Initialization

MySQL must be running and the credentials in `server/.env` must be valid. For manual local initialization, run `schema.sql`, then optionally `seed.sql`, using a MySQL client. Neither file contains destructive `DROP` statements. `seed.sql` does not create a Super Admin or contain a password.

## Application database access

The Express application uses `mysql2/promise` with a MySQL connection pool. It does not use an ORM. All application queries use parameter placeholders.

Run `schema.sql` first, then `seed.sql`. Next, configure `server/.env` and run `npm run db:seed --workspace=server` to create the bcrypt-hashed Super Admin. The application seed requires `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`; neither SQL file contains a password.

Future schema changes should be ordered SQL files under `database/`. Do not duplicate this initial schema.
