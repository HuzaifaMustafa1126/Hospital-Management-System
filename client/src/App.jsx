import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

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
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { RegistrationFeeSettingsPage } from "./pages/RegistrationFeeSettingsPage";
import { ServicesPage } from "./pages/ServicesPage";
import { SurgeryPage } from "./pages/SurgeryPage";
import { UserDetailPage } from "./pages/UserDetailPage";
import { UsersPage } from "./pages/UsersPage";

export function App() {
  return (
    <BrowserRouter>
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
              element={
                <PermissionProtectedRoute permissions={["PATIENT_VIEW"]} />
              }
            >
              <Route path="/patients" element={<PatientListPage />} />
              <Route path="/patients/:id" element={<PatientDetailPage />} />

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
            </Route>

            {/* Super Admin Routes */}
            <Route element={<RoleProtectedRoute roles={["SUPER_ADMIN"]} />}>
              <Route path="/users" element={<UsersPage />} />

              <Route path="/users/new" element={<UserDetailPage />} />

              <Route path="/users/:id" element={<UserDetailPage />} />

              <Route path="/users/:id/edit" element={<UserDetailPage />} />

              <Route path="/admin/users" element={<UsersPage />} />

              <Route path="/admin/users/create" element={<UserDetailPage />} />

              <Route
                path="/admin/users/:id/edit"
                element={<UserDetailPage />}
              />

              <Route path="/audit-logs" element={<AuditLogsPage />} />

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
            </Route>
          </Route>
        </Route>

        {/* Access Denied */}
        <Route
          path="/access-denied"
          element={
            <PlaceholderPage
              title="Access denied"
              text="You do not have permission to view this page."
            />
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
