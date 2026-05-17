import { useAuth } from '@/context/AuthContext';

export const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <div className="p-12 max-w-[1280px] mx-auto w-full">
      <header className="mb-12">
        <h1 className="font-display text-[40px] tracking-[-1.0px] font-semibold text-foreground leading-[1.15]">
          Welcome back.
        </h1>
        <p className="font-sans text-[18px] text-muted-foreground mt-2">
          Here is an overview of your {user?.role.toLowerCase()} dashboard.
        </p>
      </header>

      {/* Mock Product Screenshot Panel */}
      <div className="w-full bg-secondary rounded-[16px] p-8 shadow-gray-200/50 shadow-2xl border border-border min-h-[500px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-[#5e6ad2]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5e6ad2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.29 7 12 12 20.71 7"></polyline>
              <line x1="12" y1="22" x2="12" y2="12"></line>
            </svg>
          </div>
          <h2 className="font-display text-[22px] font-medium tracking-[-0.4px] text-foreground">
            Your workspace is ready
          </h2>
          <p className="font-sans text-[14px] text-muted-foreground max-w-sm mx-auto">
            Select an item from the sidebar to begin managing your school resources and enrollments.
          </p>
        </div>
      </div>
    </div>
  );
};
