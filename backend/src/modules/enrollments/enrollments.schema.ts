import { z } from 'zod';

export const createEnrollmentSchema = z.object({
  body: z.object({
    course_section_id: z.string().uuid('Invalid course section ID format')
  })
});

export const updateEnrollmentStatusSchema = z.object({
  body: z.object({
    status: z.enum(['approving', 'pending', 'declining'], {
      errorMap: () => ({ message: "Status must be 'approving', 'pending', or 'declining'" })
    })
  })
});
