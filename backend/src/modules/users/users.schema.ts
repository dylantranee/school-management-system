import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format'),
    role: z.enum(['Admin', 'Staff', 'Student'], {
      errorMap: () => ({ message: "Role must be 'Admin', 'Staff', or 'Student'" })
    })
  })
});

export const passwordComplexitySchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');
