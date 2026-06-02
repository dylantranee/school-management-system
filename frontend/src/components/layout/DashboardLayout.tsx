import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Home, Users, LogOut, Calendar, Wallet, BookOpen } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DashboardLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-[280px] bg-secondary border-r border-border flex flex-col flex-shrink-0">
        <div className="h-[72px] flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#5e6ad2] flex items-center justify-center">
              <span className="text-white font-display font-bold text-lg leading-none mt-1">E</span>
            </div>
            <span className="font-display font-semibold text-[18px] text-foreground tracking-tight">
              Edusoft
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] font-medium transition-colors",
                isActive 
                  ? "bg-[#5e69d1]/10 text-[#5e69d1]" 
                  : "text-muted-foreground hover:bg-secondary-foreground/5 hover:text-foreground"
              )
            }
          >
            <Home size={18} />
            Overview
          </NavLink>

          {user?.role === 'Admin' && (
            <>
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] font-medium transition-colors",
                    isActive 
                      ? "bg-[#5e69d1]/10 text-[#5e69d1]" 
                      : "text-muted-foreground hover:bg-secondary-foreground/5 hover:text-foreground"
                  )
                }
              >
                <Users size={18} />
                User Management
              </NavLink>

              <NavLink
                to="/admin/academic"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] font-medium transition-colors",
                    isActive 
                      ? "bg-[#5e69d1]/10 text-[#5e69d1]" 
                      : "text-muted-foreground hover:bg-secondary-foreground/5 hover:text-foreground"
                  )
                }
              >
                <Calendar size={18} />
                Academic Config
              </NavLink>
            </>
          )}

          {user?.role === 'Student' && (
            <NavLink
              to="/student/register"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] font-medium transition-colors",
                  isActive 
                    ? "bg-[#5e69d1]/10 text-[#5e69d1]" 
                    : "text-muted-foreground hover:bg-secondary-foreground/5 hover:text-foreground"
                )
              }
            >
              <BookOpen size={18} />
              Register Courses
            </NavLink>
          )}

          {(user?.role === 'Admin' || user?.role === 'Student' || user?.role === 'Staff') && (
            <NavLink
              to="/financials"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] font-medium transition-colors",
                  isActive 
                    ? "bg-[#5e69d1]/10 text-[#5e69d1]" 
                    : "text-muted-foreground hover:bg-secondary-foreground/5 hover:text-foreground"
                )
              }
            >
              <Wallet size={18} />
              {user?.role === 'Staff' ? 'Payroll & Payslips' : 'Financials'}
            </NavLink>
          )}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between bg-background p-3 rounded-md border border-border shadow-sm">
            <div className="flex flex-col overflow-hidden">
              <span className="text-[13px] font-medium text-foreground truncate">
                {user?.email}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {user?.role}
              </span>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto">
        {/* Background Grid Pattern (moved from UserManagementPage) */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none opacity-50"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.04' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px'
          }}
        />
        <div className="relative z-10 w-full min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
