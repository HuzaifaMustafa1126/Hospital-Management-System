# Architecture

The Hospital Management System follows the MCQ Examination System's separated client/server organization.

`React -> Axios -> Node.js/Express -> mysql2/promise -> MySQL`

The React/Vite client owns presentation, routes, session context, and API services. The Express server owns validation, JWT authentication, authorization, business services, audit logging, and parameterized SQL. `server/src/db/database.js` provides the shared MySQL connection pool.

Phase 1 includes authentication, authorization, dashboard foundation, user administration, and audit logs. Patient registration, appointments, billing, lab, surgery, blood bank, OPD, IPD, emergency, and pharmacy are deliberately deferred.
