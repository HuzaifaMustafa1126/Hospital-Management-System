import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/access';

export function PermissionProtectedRoute({ permissions }) {
  const { user } = useAuth();
  return user && permissions.every((permission) => hasPermission(user, permission))
    ? <Outlet />
    : <Navigate to="/access-denied" replace />;
}
