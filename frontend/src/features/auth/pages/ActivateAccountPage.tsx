import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useActivateAccountMutation } from '../api/auth.hooks';

const activatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export const ActivateAccountPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [globalError, setGlobalError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const activateAccountMutation = useActivateAccountMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGlobalError('');

    if (!token) {
      setGlobalError('Activation token is missing from the URL.');
      return;
    }

    const result = activatePasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        password: fieldErrors.password?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0]
      });
      return;
    }

    activateAccountMutation.mutate({ token, password }, {
      onSuccess: () => {
        setIsSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      },
      onError: (err: any) => {
        setGlobalError(err.response?.data?.message || 'Invalid or expired activation token.');
      }
    });
  };

  const isLoading = activateAccountMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.03' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="w-full max-w-[400px] bg-secondary rounded-[16px] p-8 shadow-gray-200/50 shadow-2xl relative z-10 border border-border">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="font-display font-semibold text-[24px] tracking-[-0.6px] text-foreground">
              Activate Account
            </h2>
            <p className="font-sans text-[14px] text-muted-foreground">
              Please set a password to activate your new user account.
            </p>
          </div>

          {isSuccess && (
            <div className="p-3 rounded-md bg-[#5e69d1]/10 border border-[#5e69d1]/20 text-[#5e69d1] text-[14px]">
              Account activated successfully! Redirecting you to login...
            </div>
          )}

          {globalError && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[14px]">
              {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="New Password"
              type="password"
              placeholder="Min 8 characters, number, special char"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              disabled={isLoading || isSuccess}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Verify password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              disabled={isLoading || isSuccess}
            />
            <Button type="submit" disabled={isLoading || isSuccess || !token}>
              {isLoading ? 'Activating...' : 'Activate & Save'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
