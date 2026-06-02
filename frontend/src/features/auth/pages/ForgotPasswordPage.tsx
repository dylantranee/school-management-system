import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useForgotPasswordMutation } from '../api/auth.hooks';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const forgotPasswordMutation = useForgotPasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSuccess(false);

    if (!email) {
      setError('Email address is required');
      return;
    }

    forgotPasswordMutation.mutate({ email }, {
      onSuccess: () => {
        setIsSuccess(true);
      },
      onError: (err: any) => {
        setError(err.response?.data?.message || 'An error occurred. Please try again.');
      }
    });
  };

  const isLoading = forgotPasswordMutation.isPending;

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
              Forgot Password
            </h2>
            <p className="font-sans text-[14px] text-muted-foreground">
              Enter your email address and we'll send you a password-reset link.
            </p>
          </div>

          {isSuccess && (
            <div className="p-3 rounded-md bg-[#5e69d1]/10 border border-[#5e69d1]/20 text-[#5e69d1] text-[14px]">
              If that email is registered, a password-reset link has been logged in the server console (Mock Mail Service).
            </div>
          )}

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[14px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="Email address"
              type="email"
              placeholder="example@hcmiu.edu.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || isSuccess}
            />
            <Button type="submit" disabled={isLoading || isSuccess}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          <div className="text-center mt-2">
            <Link to="/login" className="text-[14px] font-medium text-[#5e6ad2] hover:text-[#828fff] transition-colors">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
