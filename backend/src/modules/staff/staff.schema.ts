import { z } from 'zod';

export const createStaffSchema = z.object({
  body: z.object({
    employee_code: z.string().min(1, 'Employee code is required').max(100, 'Employee code must be at most 100 characters'),
    staff_first_name: z.string().min(1, 'First name is required').max(100, 'First name must be at most 100 characters'),
    staff_last_name: z.string().min(1, 'Last name is required').max(100, 'Last name must be at most 100 characters'),
    hire_date: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    department: z.string().min(1, 'Department is required').max(100, 'Department must be at most 100 characters'),
    userId: z.string().uuid('Invalid user ID format').optional()
  })
});

export const updateStaffSchema = z.object({
  body: z.object({
    employee_code: z.string().min(1, 'Employee code is required').max(100, 'Employee code must be at most 100 characters').optional(),
    staff_first_name: z.string().min(1, 'First name is required').max(100, 'First name must be at most 100 characters').optional(),
    staff_last_name: z.string().min(1, 'Last name is required').max(100, 'Last name must be at most 100 characters').optional(),
    hire_date: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    department: z.string().min(1, 'Department is required').max(100, 'Department must be at most 100 characters').optional()
  })
});
