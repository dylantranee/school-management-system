import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLogin } from '@/features/auth/api/useLogin';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email is required'),
  password: z.string().min(1, 'Password is required')
});

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Scenario 5: Empty Fields Submission / Client validation
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0]
      });
      return;
    }

    loginMutation.mutate({ email, password }, {
      onSuccess: (data) => {
        setUser(data.user);
        
        // Scenario 1 & 6: Redirect
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect') || '/dashboard';
        navigate(redirect);
      }
    });
  };

  const getGlobalError = () => {
    if (!loginMutation.error) return null;
    const err: any = loginMutation.error;
    return err.response?.data?.message || 'An unexpected error occurred. Please try again.';
  };

  const globalError = getGlobalError();
  const isLoading = loginMutation.isPending;
  
  // Check for expired session from SMS-22 Scenario 2
  const params = new URLSearchParams(window.location.search);
  const isExpired = params.get('expired') === 'true';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="font-display font-semibold text-[22px] tracking-[-0.4px] text-foreground">
          Sign in to your account
        </h2>
        <p className="font-sans text-[14px] text-muted-foreground">
          Welcome back. Please enter your details.
        </p>
      </div>

      {isExpired && !globalError && (
        <div className="p-3 rounded-md bg-secondary border border-border text-foreground text-[14px]">
          Your session has expired. Please log in again.
        </div>
      )}

      {globalError && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[14px]">
          {globalError}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Input 
          label="Email address"
          type="email" 
          placeholder="example@hcmiu.edu.vn" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          disabled={isLoading}
        />
        <div className="flex flex-col gap-1 relative">
          <Input 
            label="Password"
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            disabled={isLoading}
          />
          <div className="flex justify-end mt-1">
            <Link to="/forgot-password" className="text-[12px] font-medium text-[#5e6ad2] hover:text-[#828fff] transition-colors">
              Forgot password?
            </Link>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
};
