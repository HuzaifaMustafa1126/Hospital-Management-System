# Hospital Management System

Phase 2 includes patient registration alongside the Phase 1 foundation. It provides JWT authentication, server-enforced roles and permissions, Super Admin user management, audit logs, doctor management, and locked patient registrations. Lab, surgery, blood bank, billing, and other hospital modules are intentionally not implemented.

## Technology stack

- Client: React, Vite, Tailwind CSS, React Router, Axios
- Server: Node.js, Express, JWT, bcrypt, Zod
- Database: MySQL with `mysql2/promise` connection pooling

## Project structure

```
client/       React application
docs/         architecture, database, and role/permission notes
server/       Express API and MySQL access layer
database/     schema, seed, and future SQL migrations
```

## Installation and MySQL setup

Install Node dependencies:

```bash
npm install
```

Copy `server/.env.example` to `server/.env`. Set a long `JWT_SECRET`, valid MySQL credentials, and the initial `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`. Do not commit `.env`.

With MySQL Server running, initialize the database and create the initial Super Admin with:

```bash
npm run db:init
npm run db:seed
```

`db:init` safely creates the database, Phase 1 tables, roles, permissions, and their mappings. The application seed hashes the supplied password with bcrypt. Server startup also runs the safe initializer automatically.

Run backend and frontend in separate terminals:

```bash
npm run dev --workspace=server
npm run dev --workspace=client
```

Build and lint:

```bash
npm run build
npm run lint
```

## Authentication and access

Endpoints are under `/api/v1`: login, logout, and current user are `/auth`; user management is `/users`; audit logs are `/audit-logs`. API responses use `{ success, message, data }` and errors use `{ success, message, errors }`.

The initial roles are `SUPER_ADMIN`, `RECEPTION`, `LAB_ATTENDANT`, `SURGERY_STAFF`, `BLOOD_BANK_STAFF`, and `BILLING_STAFF`. Super Admin has every initial permission. Reception has only patient create, view, and search permissions; the patient module is reserved for the next phase. See `docs/roles-permissions.md` for the full matrix.

## Current and future phases

Current: authentication, authorization, Super Admin, Reception permission foundation, user management, audit logs, MySQL database setup, frontend login, and dashboard foundation.

Future: Patient Module, then appointments, billing, lab, surgery, blood bank, OPD, IPD, emergency, and pharmacy.
