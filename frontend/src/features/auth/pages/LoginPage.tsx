import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoginForm } from '@/features/auth/components/LoginForm';

export const LoginPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const defaultRedirect = 
        user.role === 'Admin' ? '/admin/users' :
        user.role === 'Student' ? '/student/register' :
        '/staff/timetable';
      navigate(defaultRedirect, { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left side: The form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-[480px] lg:px-20 xl:px-24 relative z-10 bg-background border-r border-border shadow-xl shadow-gray-200/50">
        <div className="w-full max-w-sm mx-auto">
          {/* Logo Placeholder */}
          <div className="mb-12 flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-[6px] flex items-center justify-center">
              <span className="text-white font-bold text-[14px]">E</span>
            </div>
            <span className="font-display font-semibold text-[18px] tracking-tight">Edusoft</span>
          </div>
          
          <LoginForm />
        </div>
      </div>

      {/* Right side: Atmospheric Product presentation (Linear style) */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-secondary p-12 overflow-hidden relative">
        {/* Subtle grid pattern for texture */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwaSIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDAuNWg0ME0wIDQwLjVoNDBNMC41IDB2NDBNNDAuNSAwdiIgc3Ryb2tlPSJyZ2JhKDAsMCwwLDAuMDQpIi8+PC9zdmc+')] opacity-50" />
        
        {/* The "Product Screenshot Card" lifting off the canvas */}
        <div className="relative w-full max-w-2xl aspect-[4/3] bg-card rounded-[16px] border border-border shadow-2xl shadow-gray-200 p-6 flex flex-col gap-4 z-10 overflow-hidden group">
          {/* Faux Window Chrome */}
          <div className="flex gap-2 items-center mb-2">
            <div className="w-3 h-3 rounded-full bg-border" />
            <div className="w-3 h-3 rounded-full bg-border" />
            <div className="w-3 h-3 rounded-full bg-border" />
          </div>
          
          {/* Faux Content */}
          <div className="flex-1 bg-background rounded-md border border-border p-4 opacity-50 group-hover:opacity-80 transition-opacity duration-1000">
            <div className="w-1/3 h-6 bg-border rounded-md mb-8" />
            <div className="space-y-4">
              <div className="h-4 w-full bg-border rounded-md" />
              <div className="h-4 w-5/6 bg-border rounded-md" />
              <div className="h-4 w-4/6 bg-border rounded-md" />
            </div>
          </div>
        </div>
        
        {/* Subtle glow behind the card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      </div>
    </div>
  );
};
