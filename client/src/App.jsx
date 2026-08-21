<<<<<<< HEAD
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PermissionProtectedRoute } from './components/PermissionProtectedRoute';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { UsersPage } from './pages/UsersPage';
import { PatientRegistrationPage } from './pages/PatientRegistrationPage';
import { PatientListPage } from './pages/PatientListPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { DoctorsPage } from './pages/DoctorsPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { ServicesPage } from './pages/ServicesPage';
import { RegistrationFeeSettingsPage } from './pages/RegistrationFeeSettingsPage';
=======
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
import { UserDetailPage } from "./pages/UserDetailPage";
import { UsersPage } from "./pages/UsersPage";
>>>>>>> 1b6046d (Add Departments)

export function App() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}><Route element={<AppLayout />}>
      <Route path="/dashboard" element={<DashboardPage />} />
<<<<<<< HEAD
      <Route element={<PermissionProtectedRoute permissions={['PATIENT_VIEW']} />}>
        <Route path="/patients" element={<PatientListPage />} />
        <Route path="/patients/:id" element={<PatientDetailPage />} />
        <Route path="/reception/patients" element={<PatientListPage />} />
        <Route path="/reception/patients/:id" element={<PatientDetailPage />} />
        <Route path="/reception/patients/register" element={<PatientRegistrationPage />} />
        <Route path="/reception/patients/search" element={<PatientListPage />} />
      </Route>
      <Route element={<RoleProtectedRoute roles={['SUPER_ADMIN']} />}>
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/new" element={<UserDetailPage />} />
        <Route path="/users/:id" element={<UserDetailPage />} />
        <Route path="/users/:id/edit" element={<UserDetailPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/users/create" element={<UserDetailPage />} />
        <Route path="/admin/users/:id/edit" element={<UserDetailPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
        <Route path="/admin/patients" element={<PatientListPage />} />
        <Route path="/admin/patients/:id/edit" element={<PatientDetailPage edit />} />
        <Route path="/admin/doctors" element={<DoctorsPage />} />
        <Route path="/departments" element={<DepartmentsPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/admin/settings/registration-fee" element={<RegistrationFeeSettingsPage />} />
=======
      <Route element={<PermissionProtectedRoute permissions={["PATIENT_VIEW"]} />}>
        <Route path="/patients" element={<PatientListPage />} /><Route path="/patients/:id" element={<PatientDetailPage />} />
        <Route path="/reception/patients" element={<PatientListPage />} /><Route path="/reception/patients/:id" element={<PatientDetailPage />} />
        <Route path="/reception/patients/register" element={<PatientRegistrationPage />} /><Route path="/reception/patients/search" element={<PatientListPage />} />
      </Route>
      <Route element={<RoleProtectedRoute roles={["LAB_ATTENDANT", "SUPER_ADMIN"]} />}>
        <Route path="/laboratory/patients" element={<LaboratoryPatientsPage />} /><Route path="/laboratory/patients/:id" element={<LaboratoryPatientPage />} />
      </Route>
      <Route element={<RoleProtectedRoute roles={["SUPER_ADMIN"]} />}>
        <Route path="/users" element={<UsersPage />} /><Route path="/users/new" element={<UserDetailPage />} /><Route path="/users/:id" element={<UserDetailPage />} /><Route path="/users/:id/edit" element={<UserDetailPage />} />
        <Route path="/admin/users" element={<UsersPage />} /><Route path="/admin/users/create" element={<UserDetailPage />} /><Route path="/admin/users/:id/edit" element={<UserDetailPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} /><Route path="/admin/patients" element={<PatientListPage />} /><Route path="/admin/patients/:id/edit" element={<PatientDetailPage edit />} />
        <Route path="/admin/doctors" element={<DoctorsPage />} /><Route path="/departments" element={<DepartmentsPage />} /><Route path="/services" element={<ServicesPage />} /><Route path="/admin/settings/registration-fee" element={<RegistrationFeeSettingsPage />} />
>>>>>>> 1b6046d (Add Departments)
      </Route>
    </Route></Route>
    <Route path="/access-denied" element={<PlaceholderPage title="Access denied" text="You do not have permission to view this page." />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes></BrowserRouter>;
}
