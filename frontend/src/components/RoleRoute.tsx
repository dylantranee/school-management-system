import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const RoleRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles: string[] }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    const fallback = 
      user.role === 'Admin' ? '/admin/users' :
      user.role === 'Student' ? '/student/register' :
      '/staff/timetable';
    return <Navigate to={fallback} replace />;
  }

  return children;
};
