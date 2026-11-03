import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Members-only pages. Visitors (and members whose session ran out) go to log in and come back here afterwards;
 * someone who just logged out or deleted their account goes home instead.
 */
export default function RequireAuth() {
  const { user, leftOnPurpose } = useAuth();
  const { pathname, search } = useLocation();
  if (user) return <Outlet />;
  return <Navigate to={leftOnPurpose ? '/' : `/login?next=${encodeURIComponent(pathname + search)}`} replace />;
}
