import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useCreateUser } from '../api/users.hooks';

const createUserSchema = z.object({
  email: z.string().email('Invalid email address format'),
  role: z.enum(['Admin', 'Staff', 'Student'], {
    errorMap: () => ({ message: "Role must be 'Admin', 'Staff', or 'Student'" })
  })
});

export const CreateUserForm = () => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [errors, setErrors] = useState<{ email?: string; role?: string }>({});
  const [activationLink, setActivationLink] = useState('');
  
  const createUserMutation = useCreateUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setActivationLink('');

    const result = createUserSchema.safeParse({ email, role });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        email: fieldErrors.email?.[0],
        role: fieldErrors.role?.[0]
      });
      return;
    }

    createUserMutation.mutate({ email, role }, {
      onSuccess: (data) => {
        // Reset form on success
        setEmail('');
        setRole('');
        if (data.activationToken) {
          setActivationLink(`${window.location.origin}/activate?token=${data.activationToken}`);
        }
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
        <div className="flex flex-col gap-2 p-3 rounded-md bg-[#5e69d1]/10 border border-[#5e69d1]/20 text-[#5e69d1] text-[14px]">
          <span>User account created successfully!</span>
          {activationLink && (
            <div className="mt-1 flex flex-col gap-1">
              <span className="text-[12px] font-semibold text-muted-foreground">Activation Link (Mock Email):</span>
              <input 
                type="text" 
                readOnly 
                value={activationLink}
                className="w-full bg-background border border-border rounded px-2 py-1 text-[12px] font-mono select-all text-foreground"
              />
            </div>
          )}
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
          autoComplete="new-email"
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
