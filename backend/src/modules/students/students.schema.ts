import { z } from 'zod';

export const createStudentSchema = z.object({
  body: z.object({
    student_code: z.string().min(1, 'Student code is required').max(100, 'Student code must be at most 100 characters'),
    student_first_name: z.string().min(1, 'First name is required').max(100, 'First name must be at most 100 characters'),
    student_last_name: z.string().min(1, 'Last name is required').max(100, 'Last name must be at most 100 characters'),
    enrollment_date: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    userId: z.string().uuid('Invalid user ID format').optional()
  })
});

export const updateStudentSchema = z.object({
  body: z.object({
    student_code: z.string().min(1, 'Student code is required').max(100, 'Student code must be at most 100 characters').optional(),
    student_first_name: z.string().min(1, 'First name is required').max(100, 'First name must be at most 100 characters').optional(),
    student_last_name: z.string().min(1, 'Last name is required').max(100, 'Last name must be at most 100 characters').optional(),
    enrollment_date: z.string().datetime({ offset: true }).or(z.string().date()).optional()
  })
});
