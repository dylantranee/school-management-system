import { z } from 'zod';

export const generateFeesSchema = z.object({
  body: z.object({
    cost_per_credit: z.number().positive('Cost per credit must be a positive number'),
    due_date: z.string().datetime({ message: 'Due date must be a valid ISO datetime string' })
  })
});

export const recordPaymentSchema = z.object({
  body: z.object({
    amount: z.number().positive('Payment amount must be positive')
  })
});
