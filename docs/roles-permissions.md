# Roles and permissions

Phase 1 defines six roles: `SUPER_ADMIN`, `RECEPTION`, `LAB_ATTENDANT`,
`SURGERY_STAFF`, `BLOOD_BANK_STAFF`, and `BILLING_STAFF`.

`SUPER_ADMIN` is assigned every current permission and is the only role allowed
to access the user-management API and UI. It can view audit logs.

`RECEPTION` receives only `PATIENT_CREATE`, `PATIENT_VIEW`, and
`PATIENT_SEARCH`. Those permissions are prepared for the next phase; patient
registration is not yet implemented. Reception cannot manage users, roles,
audit logs, services, or bills.

The remaining four roles are placeholders for future modules and have no active
permissions in Phase 1.

Current permissions are:

- Patient: `PATIENT_CREATE`, `PATIENT_VIEW`, `PATIENT_UPDATE`,
  `PATIENT_DELETE`, `PATIENT_SEARCH`
- Services: `LAB_SERVICE_ADD`, `SURGERY_SERVICE_ADD`, `BLOOD_SERVICE_ADD`
- Billing: `BILL_CREATE`, `BILL_VIEW`, `BILL_PRINT`
- Users and audit: `USER_CREATE`, `USER_VIEW`, `USER_UPDATE`, `USER_DELETE`,
  `AUDIT_LOG_VIEW`

The backend is authoritative. The frontend also uses role checks to hide or
redirect inaccessible screens, but cannot grant access by itself.
