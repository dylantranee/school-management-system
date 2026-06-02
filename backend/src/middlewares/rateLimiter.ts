import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator: (req: Request) => string | string[];
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Periodic memory cleanup to prevent memory leaks from old IP records
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // every 5 minutes

export const rateLimiter = (options: RateLimiterOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const keys = options.keyGenerator(req);
    const keyList = Array.isArray(keys) ? keys : [keys];
    const now = Date.now();

    for (const key of keyList) {
      const record = rateLimitStore.get(key);

      if (!record) {
        rateLimitStore.set(key, { count: 1, resetTime: now + options.windowMs });
        continue;
      }

      if (now > record.resetTime) {
        rateLimitStore.set(key, { count: 1, resetTime: now + options.windowMs });
        continue;
      }

      record.count += 1;
      rateLimitStore.set(key, record);

      if (record.count > options.max) {
        return next(new ApiError(429, options.message));
      }
    }

    next();
  };
};
