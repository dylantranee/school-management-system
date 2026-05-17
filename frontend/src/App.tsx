import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LoginPage } from './features/auth/pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { Button } from './components/ui/Button';

const queryClient = new QueryClient();

// Dummy Dashboard Component to verify login/logout
const Dashboard = () => {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="bg-card border border-border p-8 rounded-lg shadow-xl max-w-md w-full text-center space-y-6">
        <h1 className="font-display text-2xl text-foreground">Welcome to your Dashboard</h1>
        <p className="text-muted-foreground font-sans">
          You are logged in as <strong className="text-foreground">{user?.email}</strong>
        </p>
        <p className="text-muted-foreground font-sans text-sm">
          Role: {user?.role}
        </p>
        <Button onClick={logout} variant="secondary" className="w-full">
          Secure Logout
        </Button>
      </div>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
