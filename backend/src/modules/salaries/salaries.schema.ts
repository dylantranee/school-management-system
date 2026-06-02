import { z } from 'zod';

export const createSalarySchema = z.object({
  body: z.object({
    base_salary: z.number().nonnegative('Base salary must be non-negative'),
    allowances: z.number().nonnegative('Allowances must be non-negative').optional(),
    deductions: z.number().nonnegative('Deductions must be non-negative').optional(),
    payment_month: z.number().int().min(1, 'Month must be between 1 and 12').max(12, 'Month must be between 1 and 12'),
    payment_year: z.number().int('Year must be an integer').positive('Year must be positive'),
    staff_id: z.string().uuid('Invalid staff ID format')
  })
});
