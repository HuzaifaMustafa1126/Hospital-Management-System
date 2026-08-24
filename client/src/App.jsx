import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { PermissionProtectedRoute } from "./components/PermissionProtectedRoute";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";

import { AppLayout } from "./layouts/AppLayout";

import { AuditLogsPage } from "./pages/AuditLogsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DepartmentsPage } from "./pages/DepartmentsPage";
import { DoctorsPage } from "./pages/DoctorsPage";
import { LaboratoryPatientPage } from "./pages/LaboratoryPatientPage";
import { LaboratoryPatientsPage } from "./pages/LaboratoryPatientsPage";
import { LoginPage } from "./pages/LoginPage";
import { PatientDetailPage } from "./pages/PatientDetailPage";
import { PatientListPage } from "./pages/PatientListPage";
import { PatientRegistrationPage } from "./pages/PatientRegistrationPage";
import { UnauthorizedPage } from "./pages/UnauthorizedPage";
import { RegistrationFeeSettingsPage } from "./pages/RegistrationFeeSettingsPage";
import { RevenuePage } from "./pages/RevenuePage";
import { ServicesPage } from "./pages/ServicesPage";
import { SurgeryPage } from "./pages/SurgeryPage";
import { SurgeryPatientPage } from "./pages/SurgeryPatientPage";
import { SurgeryPatientsPage } from "./pages/SurgeryPatientsPage";
import { UserDetailPage } from "./pages/UserDetailPage";
import { VisitDetailPage } from "./pages/VisitDetailPage";
import { NewVisitPage } from "./pages/NewVisitPage";
import { UsersPage } from "./pages/UsersPage";
import { BloodBankPage } from "./pages/BloodBankPage";
import { BloodBankPatientsPage } from "./pages/BloodBankPatientsPage";
import { BloodBankPatientPage } from "./pages/BloodBankPatientPage";
import { BillingPage } from "./pages/BillingPage";
import { BillDetailPage } from "./pages/BillDetailPage";
import { InvoicePreviewPage } from "./pages/InvoicePreviewPage";
import { PaymentReceiptPage } from "./pages/PaymentReceiptPage";
import { HospitalSettingsPage } from "./pages/HospitalSettingsPage";

export function App() {
  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected application */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Dashboard */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Patient Routes */}
          <Route
            element={<PermissionProtectedRoute permissions={["BILL_VIEW"]} />}
          >
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/billing/:id" element={<BillDetailPage />} />
            <Route
              element={
                <PermissionProtectedRoute permissions={["BILL_PRINT"]} />
              }
            >
              <Route
                path="/billing/:id/invoice"
                element={<InvoicePreviewPage />}
              />
              <Route
                path="/billing/:id/payments/:paymentNumber/receipt"
                element={<PaymentReceiptPage />}
              />
            </Route>
          </Route>
          <Route
            element={
              <PermissionProtectedRoute permissions={["PATIENT_VIEW"]} />
            }
          >
            <Route path="/patients" element={<PatientListPage />} />
            <Route path="/patients/:id" element={<PatientDetailPage />} />
            <Route
              element={
                <PermissionProtectedRoute permissions={["VISIT_VIEW"]} />
              }
            >
              <Route path="/visits/:id" element={<VisitDetailPage />} />
            </Route>
            <Route
              element={
                <PermissionProtectedRoute permissions={["VISIT_CREATE"]} />
              }
            >
              <Route
                path="/patients/:id/visits/new"
                element={<NewVisitPage />}
              />
            </Route>

            <Route path="/reception/patients" element={<PatientListPage />} />

            <Route
              path="/reception/patients/:id"
              element={<PatientDetailPage />}
            />

            <Route
              path="/reception/patients/register"
              element={<PatientRegistrationPage />}
            />

            <Route
              path="/reception/patients/search"
              element={<PatientListPage />}
            />
          </Route>

          {/* Laboratory Routes */}
          <Route
            element={
              <RoleProtectedRoute roles={["LAB_ATTENDANT", "SUPER_ADMIN"]} />
            }
          >
            <Route
              path="/laboratory/patients"
              element={<LaboratoryPatientsPage />}
            />

            <Route
              path="/laboratory/patients/:id"
              element={<LaboratoryPatientPage />}
            />
          </Route>
          <Route
            element={
              <RoleProtectedRoute
                roles={["SURGERY_ATTENDANT", "SUPER_ADMIN"]}
              />
            }
          >
            <Route path="/surgery" element={<SurgeryPage />} />
            <Route path="/surgery/patients" element={<SurgeryPatientsPage />} />
            <Route
              path="/surgery/patients/:id"
              element={<SurgeryPatientPage />}
            />
          </Route>
          <Route
            element={
              <RoleProtectedRoute roles={["BLOOD_BANK_STAFF", "SUPER_ADMIN"]} />
            }
          >
            <Route path="/blood-bank" element={<BloodBankPage />} />
            <Route
              path="/blood-bank/patients"
              element={<BloodBankPatientsPage />}
            />
            <Route
              path="/blood-bank/patients/:id"
              element={<BloodBankPatientPage />}
            />
          </Route>

          {/* Super Admin Routes */}
          <Route element={<RoleProtectedRoute roles={["SUPER_ADMIN"]} />}>
            <Route path="/users" element={<UsersPage />} />

            <Route path="/users/new" element={<UserDetailPage />} />

            <Route path="/users/:id" element={<UserDetailPage />} />

            <Route path="/users/:id/edit" element={<UserDetailPage />} />

            <Route path="/admin/users" element={<UsersPage />} />

            <Route path="/admin/users/create" element={<UserDetailPage />} />

            <Route path="/admin/users/:id/edit" element={<UserDetailPage />} />

            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/revenue" element={<RevenuePage />} />

            <Route path="/admin/patients" element={<PatientListPage />} />

            <Route
              path="/admin/patients/:id/edit"
              element={<PatientDetailPage edit />}
            />

            <Route path="/admin/doctors" element={<DoctorsPage />} />

            {/* Departments */}
            <Route path="/departments" element={<DepartmentsPage />} />

            {/* Services */}
            <Route path="/services" element={<ServicesPage />} />

            {/* Registration Fee */}
            <Route
              path="/admin/settings/registration-fee"
              element={<RegistrationFeeSettingsPage />}
            />
            <Route
              path="/settings/hospital"
              element={<HospitalSettingsPage />}
            />
          </Route>
        </Route>
      </Route>

      {/* Access Denied */}
      <Route path="/access-denied" element={<UnauthorizedPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
