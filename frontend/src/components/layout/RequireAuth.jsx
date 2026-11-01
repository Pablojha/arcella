import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RequireAuth() {
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  return user ? <Outlet /> : <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
}
