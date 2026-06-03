import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { ActivateAccountPage } from '@/features/auth/pages/ActivateAccountPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RoleRoute } from '@/components/RoleRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UserManagementPage } from '@/features/users/pages/UserManagementPage';
import { AcademicManagementPage } from '@/features/academic/pages/AcademicManagementPage';
import { StudentRegistrationPage } from '@/features/academic/pages/StudentRegistrationPage';
import { FinancialsManagementPage } from '@/features/financials/pages/FinancialsManagementPage';
import { StaffTimetablePage } from '@/features/academic/pages/StaffTimetablePage';
import { AdvisorApprovalsPage } from '@/features/academic/pages/AdvisorApprovalsPage';

const queryClient = new QueryClient();

const DefaultRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'Admin') return <Navigate to="/admin/users" replace />;
  if (user.role === 'Student') return <Navigate to="/student/register" replace />;
  if (user.role === 'Staff') return <Navigate to="/staff/timetable" replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<DefaultRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/activate" element={<ActivateAccountPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            
            {/* Dashboard Shell - Wraps all protected routes */}
            <Route element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<DefaultRedirect />} />
              
              <Route path="/admin/users" element={
                <RoleRoute allowedRoles={['Admin']}>
                  <UserManagementPage />
                </RoleRoute>
              } />

              <Route path="/admin/academic" element={
                <RoleRoute allowedRoles={['Admin']}>
                  <AcademicManagementPage />
                </RoleRoute>
              } />

              <Route path="/student/register" element={
                <RoleRoute allowedRoles={['Student']}>
                  <StudentRegistrationPage />
                </RoleRoute>
              } />

              <Route path="/staff/timetable" element={
                <RoleRoute allowedRoles={['Staff']}>
                  <StaffTimetablePage />
                </RoleRoute>
              } />

              <Route path="/staff/approvals" element={
                <RoleRoute allowedRoles={['Staff']}>
                  <AdvisorApprovalsPage />
                </RoleRoute>
              } />

              <Route path="/financials" element={
                <RoleRoute allowedRoles={['Admin', 'Student', 'Staff']}>
                  <FinancialsManagementPage />
                </RoleRoute>
              } />
            </Route>

            <Route path="*" element={<DefaultRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
