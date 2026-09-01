# 🏥 Hospital Management System

A modern, role-based **Hospital Management System** built to manage patient registration, repeat visits, doctors, hospital services, billing, revenue, staff access, permissions, and audit activity from one centralized platform.

The system is designed around a **patient-first visit workflow**. A patient is registered once and can return for multiple visits without creating duplicate patient records. Each visit can maintain its own doctor, registration fee, selected services, billing information, and history.

---

## 📌 Project Overview

The Hospital Management System provides a secure and scalable foundation for managing day-to-day hospital operations.

The current system includes:

* Secure JWT authentication
* Role-based access control
* Permission-based route and API protection
* Staff/user management
* Patient registration
* Returning patient / repeat visit management
* Doctor management
* Department management
* Hospital service management
* Registration fee management
* Billing and invoice generation
* Revenue tracking
* Audit logs
* Dashboard and operational statistics
* Printable patient bills/receipts

The architecture is designed so additional modules such as **Lab, Surgery, Blood Bank, Pharmacy, OPD, IPD, Emergency, and Radiology** can be integrated later without redesigning the core system.

---

# 🚀 Technology Stack

## Frontend

* React
* Vite
* Tailwind CSS
* React Router
* Axios

## Backend

* Node.js
* Express.js
* JWT Authentication
* bcrypt
* Zod validation

## Database

* MySQL
* `mysql2/promise`
* Connection pooling
* SQL migrations / initialization scripts

---

# 📂 Project Structure

```text
Hospital-Management-System/
│
├── client/
│   └── React frontend application
│
├── server/
│   └── Express REST API
│
├── database/
│   ├── schema
│   ├── seed
│   └── migrations
│
├── docs/
│   ├── architecture
│   ├── database documentation
│   └── roles and permissions
│
└── README.md
```

---

# 🔐 Authentication

The system uses **JWT-based authentication**.

Users log in with their credentials and receive an authentication token that is used to access protected API endpoints.

Passwords are securely hashed using **bcrypt** and are never stored as plain text.

Authentication includes:

* Login
* Logout
* Current authenticated user
* Protected frontend routes
* Protected backend APIs
* Role validation
* Permission validation

Main authentication endpoints:

```text
/api/v1/auth/login
/api/v1/auth/logout
/api/v1/auth/me
```

---

# 👥 Roles & Permissions

The system uses both **Role-Based Access Control (RBAC)** and individual permissions.

Default roles include:

```text
SUPER_ADMIN
RECEPTION
LAB_ATTENDANT
SURGERY_STAFF
BLOOD_BANK_STAFF
BILLING_STAFF
```

Permissions are enforced by the backend and are not limited to frontend visibility.

## Super Admin

The Super Admin has complete system access.

Typical capabilities include:

* Manage users
* Manage roles and permissions
* View all patients
* Edit patient information
* Manage doctors
* Manage departments
* Manage services
* Manage registration fees
* View billing
* View revenue
* View audit logs
* Access administrative settings

## Reception

Reception is primarily responsible for patient registration and visits.

Typical capabilities include:

* Register patients
* Search patients
* View patient information
* Create another visit for an existing patient
* Select doctor
* Select registration fee
* Add permitted services
* Generate patient billing information

Reception users cannot modify protected patient registration information unless explicitly granted permission.

---

# 🧑‍⚕️ Patient Management

The Patient Module is one of the core parts of the system.

Patient information can include:

```text
Patient ID
First Name
Last Name
Father Name
CNIC
Phone Number
Address
Assigned Doctor
Registration Date
Status
Visit History
```

Every patient receives a unique patient record.

Example:

```text
P-0001 — Ali Ahmed
P-0002 — Ahmed Khan
P-0003 — Usman Ali
```

CNIC and phone number checks help prevent duplicate patient records.

---

# 🔄 Returning Patient / Visit Management

Returning patients are **not registered as new patients**.

When an existing patient comes back to the hospital, staff can use the **Visit Again** workflow.

Example:

```text
Patient
└── P-0001 — Ali Ahmed
    │
    ├── Visit #1
    │   ├── Doctor
    │   ├── Registration Fee
    │   ├── Services
    │   └── Bill
    │
    ├── Visit #2
    │   ├── Doctor
    │   ├── Registration Fee
    │   ├── Services
    │   └── Bill
    │
    └── Visit #3
        ├── Doctor
        ├── Registration Fee
        ├── Services
        └── Bill
```

This keeps the patient database clean while maintaining a complete history of hospital visits.

Each visit can maintain its own:

* Visit number
* Visit date/time
* Doctor
* Registration fee
* Fee type
* Services
* Charges
* Payment information
* Billing record
* Created-by user

---

# 💰 Registration Fee Management

Registration fees can be configured according to hospital requirements.

Supported fee types include:

### FREE

No registration amount is charged.

### DISCOUNTED

A custom registration amount can be entered for the patient or visit.

Registration fees are associated with the relevant visit so returning patients can have different fee information for different visits.

---

# 👨‍⚕️ Doctor Management

Authorized users can manage doctors available within the hospital.

Doctor information can include:

* Doctor name
* Department
* Contact information
* Status
* Created date
* Updated date

Patients and visits can be associated with a doctor.

This allows the system to maintain doctor-specific patient and visit records.

---

# 🏢 Department Management

Hospital departments can be maintained centrally.

Examples include:

```text
General Medicine
Cardiology
Laboratory
Surgery
Blood Bank
Emergency
Radiology
Pharmacy
```

Departments provide the foundation for organizing doctors, services, and future hospital modules.

---

# 🧪 Services Management

Hospital services can be created and managed by authorized users.

Example services:

```text
Blood Test
CBC
Sugar Test
Consultation
ECG
Surgery Service
Laboratory Test
Other Hospital Services
```

Each service can contain information such as:

* Service name
* Service type
* Department
* Price
* Status
* Icon/type
* Created date

Services can be added to the appropriate patient visit.

---

# 🧾 Billing

Billing is linked with patient visits.

A bill can contain:

```text
Patient Information
Patient ID
Visit Number
Doctor
Registration Fee
Selected Services
Individual Service Charges
Total Amount
Payment Method
Billing Date
```

The total can be calculated using:

```text
Total Bill =
Registration Fee
+ Service Charges
+ Other Applicable Charges
```

This visit-based structure prevents charges from different visits from being mixed together.

---

# 🖨️ Bill & Receipt Printing

The system supports printable patient billing information.

The billing workflow is designed for formats such as:

* Thermal receipt
* 58mm / 80mm printer
* A4 invoice
* Browser printing
* PDF invoice

A receipt can contain:

```text
Hospital Information
Patient Information
Patient ID
Visit Number
Doctor
Date / Time
Registration Fee
Services
Total Amount
Payment Method
```

---

# 📊 Revenue Management

Authorized administrative users can view hospital revenue.

Revenue can be calculated from:

* Registration fees
* Service charges
* Visit billing
* Other supported hospital charges

Revenue access is permission-protected.

For example, **Super Admin** can access overall revenue information while restricted staff roles only see information relevant to their responsibilities.

---

# 📜 Audit Logs

Important activities are recorded through the Audit Log system.

Audit information can include:

```text
User
Role
Action
Module
Record
Description
Date
Time
IP / Request Information
```

Examples:

```text
Patient Created
Patient Updated
Visit Created
Service Added
Bill Generated
Doctor Created
User Created
Role Updated
Login
Logout
```

Audit logs improve accountability and help administrators track important activity across the system.

---

# 📊 Dashboard

The dashboard provides an overview of hospital activity.

Depending on permissions, dashboard information can include:

* Total patients
* Today's patients
* Today's visits
* Returning patients
* Doctors
* Services
* Revenue
* Recent registrations
* Recent visits
* Recent activity
* Charts and statistics

Dashboard information is protected according to the authenticated user's permissions.

---

# 🔒 Patient Record Protection

Patient registration information is protected after creation.

The system follows the rule:

```text
Reception → Create / View / Search
Super Admin → Create / View / Search / Edit
```

Sensitive editing operations are enforced on the **server**, not only hidden from the frontend.

This prevents unauthorized users from bypassing frontend restrictions by directly calling the API.

---

# 🔎 Duplicate Patient Prevention

The system checks identifying information such as:

```text
CNIC
Phone Number
```

If an existing patient is found, staff should not create another patient record.

Instead:

```text
Search Existing Patient
        ↓
Open Patient
        ↓
Visit Again
        ↓
Create New Visit
        ↓
Select Doctor
        ↓
Apply Registration Fee
        ↓
Add Services
        ↓
Generate Bill
```

---

# 🔄 Main Hospital Workflow

```text
Login
  ↓
Dashboard
  ↓
Search Patient
  ↓
Is Patient Registered?
  │
  ├── NO
  │    ↓
  │  Register Patient
  │    ↓
  │  Create First Visit
  │
  └── YES
       ↓
     Open Patient
       ↓
     Visit Again
       ↓
     Create New Visit
       ↓
Select Doctor
       ↓
Registration Fee
       ↓
Add Services
       ↓
Generate Bill
       ↓
Print Receipt / Invoice
       ↓
Update Revenue
       ↓
Audit Activity
```

---

# 🛡️ Security

The system includes multiple security layers:

* JWT authentication
* bcrypt password hashing
* Server-side authorization
* Role-based access control
* Permission-based access control
* Zod request validation
* Protected API endpoints
* Protected frontend routes
* Environment variables
* SQL parameterization
* Audit logging

Sensitive credentials must never be committed to Git.

---

# ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/HuzaifaMustafa1126/Hospital-Management-System.git
```

Enter the project directory:

```bash
cd Hospital-Management-System
```

Install dependencies:

```bash
npm install
```

---

# 🗄️ Environment Configuration

Copy:

```text
server/.env.example
```

to:

```text
server/.env
```

Configure the required environment variables.

Example:

```env
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=hospital_management

JWT_SECRET=your_long_secure_secret
JWT_EXPIRES_IN=1d

SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=your_secure_password

CORS_ORIGIN=http://localhost:5173
```

> Never commit the real `.env` file or production credentials to GitHub.

---

# 🗃️ Database Setup

Make sure MySQL Server is installed and running.

Initialize the database:

```bash
npm run db:init
```

Seed the initial data:

```bash
npm run db:seed
```

The initializer safely prepares the required database structure, roles, permissions, and mappings.

The seed process creates the initial Super Admin account using the credentials configured in the environment variables.

---

# 💻 Development

Run the backend:

```bash
npm run dev --workspace=server
```

Run the frontend in another terminal:

```bash
npm run dev --workspace=client
```

The development setup normally consists of:

```text
React Client
     ↓
Express REST API
     ↓
MySQL Database
```

---

# 🏗️ Production Build

Build the project using:

```bash
npm run build
```

Run lint checks using:

```bash
npm run lint
```

---

# 🌐 API Structure

The REST API uses the following base path:

```text
/api/v1
```

Main API areas include:

```text
/api/v1/auth
/api/v1/users
/api/v1/patients
/api/v1/visits
/api/v1/doctors
/api/v1/departments
/api/v1/services
/api/v1/billing
/api/v1/audit-logs
```

API success responses follow a consistent structure:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

Error responses follow:

```json
{
  "success": false,
  "message": "Unable to complete operation",
  "errors": []
}
```

---

# 🗺️ Development Roadmap

## ✅ Foundation

* Authentication
* JWT security
* Roles
* Permissions
* User management
* Audit logs
* MySQL initialization
* Protected frontend routes
* Protected backend APIs

## ✅ Patient Management

* Patient registration
* Patient list
* Patient search
* Patient details
* CNIC validation
* Phone validation
* Duplicate patient detection
* Registration locking
* Super Admin editing

## ✅ Visit Management

* Returning patient workflow
* Visit Again functionality
* Multiple visits per patient
* Doctor assignment per visit
* Registration fee per visit
* Visit history

## ✅ Hospital Administration

* Doctor management
* Department management
* Service management
* Registration fee settings

## 🚧 Billing & Operational Improvements

* Service-based billing
* Invoice improvements
* Thermal receipt support
* A4 invoice
* Revenue reporting
* Dashboard analytics
* Improved notifications and access-denied feedback

## 🔜 Future Modules

Planned expansion includes:

* Laboratory
* Surgery
* Blood Bank
* OPD
* IPD
* Emergency
* Pharmacy
* Radiology
* Appointment Management
* Advanced Reports
* Inventory Management

---

# 🎯 Project Goal

The goal of this project is to build a practical hospital management platform that can grow module-by-module without compromising data integrity, security, or usability.

The core architecture follows one important principle:

**One Patient → Multiple Visits → Multiple Services → Separate Billing History**

This approach prevents duplicate patient records while maintaining a complete history of every interaction with the hospital.

---

# 📦 Repository

**Hospital Management System**

GitHub Repository:

`HuzaifaMustafa1126/Hospital-Management-System`

---

## 👨‍💻 Development

Developed as a modular Hospital Management System using **React, Node.js, Express, and MySQL**, with a focus on secure access control, patient visit history, billing, auditability, and future hospital-module expansion.
