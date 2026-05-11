import { Navigate } from 'react-router-dom';
import { isAuthenticated, isAdmin } from '../utils/auth';

export function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

export function AdminRoute({ children }) {
  return isAdmin() ? children : <Navigate to="/admin/login" replace />;
}
