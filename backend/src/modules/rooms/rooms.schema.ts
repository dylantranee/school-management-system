import { z } from 'zod';

export const createRoomSchema = z.object({
  body: z.object({
    room_number: z.string().min(1, 'Room number is required').max(50, 'Room number must be at most 50 characters'),
    capacity: z.number().int('Capacity must be an integer').nonnegative('Capacity must be a non-negative number'),
    is_lab: z.boolean().optional()
  })
});

export const updateRoomSchema = z.object({
  body: z.object({
    room_number: z.string().min(1, 'Room number is required').max(50, 'Room number must be at most 50 characters').optional(),
    capacity: z.number().int('Capacity must be an integer').nonnegative('Capacity must be a non-negative number').optional(),
    is_lab: z.boolean().optional(),
    is_active: z.boolean().optional()
  })
});
