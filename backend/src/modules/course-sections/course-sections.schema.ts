import { z } from 'zod';

export const createCourseSectionSchema = z.object({
  body: z.object({
    semester: z.enum(['1', '2', '3'], {
      errorMap: () => ({ message: "Semester must be '1', '2', or '3'" })
    }),
    academic_year: z.number().int('Academic year must be an integer').positive('Academic year must be positive'),
    section_number: z.string().min(1, 'Section number is required').max(10, 'Section number is too long'),
    max_capacity: z.number().int('Max capacity must be an integer').positive('Max capacity must be positive'),
    subject_id: z.string().uuid('Invalid subject ID format'),
    staff_id: z.string().uuid('Invalid staff ID format')
  })
});

export const updateCourseSectionSchema = z.object({
  body: z.object({
    semester: z.enum(['1', '2', '3']).optional(),
    academic_year: z.number().int().positive().optional(),
    section_number: z.string().min(1).max(10).optional(),
    max_capacity: z.number().int().positive().optional(),
    subject_id: z.string().uuid().optional(),
    staff_id: z.string().uuid().optional()
  })
});
