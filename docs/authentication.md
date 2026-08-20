# Authentication and authorization

`POST /api/v1/auth/login` validates an active user's bcrypt password and returns a JWT, user, and role information. `GET /api/v1/auth/me` requires the JWT Bearer token. `POST /api/v1/auth/logout` records a logout audit event; JWT invalidation is not persisted in Phase 1.

The server enforces access with `authenticate`, `requireRole`, and `requirePermission` middleware. User management is restricted to `SUPER_ADMIN`; audit-log viewing requires `AUDIT_LOG_VIEW`.

The initial roles are `SUPER_ADMIN`, `RECEPTION`, `LAB_ATTENDANT`, `SURGERY_STAFF`, `BLOOD_BANK_STAFF`, and `BILLING_STAFF`. Super Admin receives every initial permission. Reception receives only `PATIENT_CREATE`, `PATIENT_VIEW`, and `PATIENT_SEARCH`; no patient module is implemented yet.
