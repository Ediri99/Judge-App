import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  roles?: Array<'judge' | 'admin'>;
}

export function ProtectedRoute({ roles = ['judge'] }: ProtectedRouteProps) {
  const { user, loading, roles: userRoles } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="page-shell">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  if (roles.some((role) => userRoles.includes(role))) {
    return <Outlet />;
  }

  return <Navigate to="/judge" replace />;
}
