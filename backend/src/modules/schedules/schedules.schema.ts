import { z } from 'zod';

export const createScheduleSchema = z.object({
  body: z.object({
    day_of_week: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], {
      errorMap: () => ({ message: "Day of week must be MON, TUE, WED, THU, FRI, or SAT" })
    }),
    start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Start time must be in HH:MM:SS format'),
    end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'End time must be in HH:MM:SS format'),
    course_section_id: z.string().uuid('Invalid course section ID format'),
    room_id: z.string().uuid('Invalid room ID format')
  })
});

export const updateScheduleSchema = z.object({
  body: z.object({
    day_of_week: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']).optional(),
    start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Start time must be in HH:MM:SS format').optional(),
    end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'End time must be in HH:MM:SS format').optional(),
    course_section_id: z.string().uuid('Invalid course section ID format').optional(),
    room_id: z.string().uuid('Invalid room ID format').optional()
  })
});
