import { z } from 'zod';

export const createSubjectSchema = z.object({
  body: z.object({
    subject_name: z.string().min(1, 'Subject name is required').max(100, 'Subject name must be at most 100 characters'),
    subject_code: z.string().min(1, 'Subject code is required').max(100, 'Subject code must be at most 100 characters'),
    credits: z.number().int('Credits must be an integer').nonnegative('Credits must be non-negative')
  })
});

export const updateSubjectSchema = z.object({
  body: z.object({
    subject_name: z.string().min(1, 'Subject name is required').max(100, 'Subject name must be at most 100 characters').optional(),
    subject_code: z.string().min(1, 'Subject code is required').max(100, 'Subject code must be at most 100 characters').optional(),
    credits: z.number().int('Credits must be an integer').nonnegative('Credits must be non-negative').optional()
  })
});
