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

export function App() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}><Route element={<AppLayout />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route element={<PermissionProtectedRoute permissions={['PATIENT_VIEW']} />}>
        <Route path="/patients" element={<PlaceholderPage title="Patient Registration" text="Patient registration will be implemented in the next phase." />} />
      </Route>
      <Route element={<RoleProtectedRoute roles={['SUPER_ADMIN']} />}>
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/new" element={<UserDetailPage />} />
        <Route path="/users/:id" element={<UserDetailPage />} />
        <Route path="/users/:id/edit" element={<UserDetailPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
      </Route>
    </Route></Route>
    <Route path="/access-denied" element={<PlaceholderPage title="Access denied" text="You do not have permission to view this page." />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes></BrowserRouter>;
}
