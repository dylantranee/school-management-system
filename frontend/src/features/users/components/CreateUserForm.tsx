import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useCreateUser } from '../api/useCreateUser';

const createUserSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  role: z.enum(['Admin', 'Staff', 'Student'], {
    errorMap: () => ({ message: "Role must be 'Admin', 'Staff', or 'Student'" })
  })
});

export const CreateUserForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; role?: string }>({});
  
  const createUserMutation = useCreateUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = createUserSchema.safeParse({ email, password, role });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
        role: fieldErrors.role?.[0]
      });
      return;
    }

    createUserMutation.mutate({ email, password, role }, {
      onSuccess: () => {
        // Reset form on success
        setEmail('');
        setPassword('');
        setRole('');
      }
    });
  };

  const getGlobalError = () => {
    if (!createUserMutation.error) return null;
    const err: any = createUserMutation.error;
    return err.response?.data?.message || 'An unexpected error occurred.';
  };

  const globalError = getGlobalError();
  const isLoading = createUserMutation.isPending;
  const isSuccess = createUserMutation.isSuccess;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" autoComplete="off">
      <div className="flex flex-col gap-2">
        <h2 className="font-display font-semibold text-[22px] tracking-[-0.4px] text-foreground">
          Create New User
        </h2>
        <p className="font-sans text-[14px] text-muted-foreground">
          Add a new Admin, Staff, or Student to the system.
        </p>
      </div>

      {isSuccess && !createUserMutation.isPending && (
        <div className="p-3 rounded-md bg-[#5e69d1]/10 border border-[#5e69d1]/20 text-[#5e69d1] text-[14px]">
          User account created successfully!
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
          autoComplete="new-email" // specific hint to avoid autofilling saved logins
        />
        <Input 
          label="Password"
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={isLoading}
          autoComplete="new-password" // strongly hints to the browser not to autofill this
        />
        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          error={errors.role}
          disabled={isLoading}
          options={[
            { value: 'Admin', label: 'Admin' },
            { value: 'Staff', label: 'Staff' },
            { value: 'Student', label: 'Student' }
          ]}
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Account'}
      </Button>
    </form>
  );
};
