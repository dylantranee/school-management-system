import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const RoleRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles: string[] }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // If they don't have access, bounce them back to their dashboard (or a generic 403 page)
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
