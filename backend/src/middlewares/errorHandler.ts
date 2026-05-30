import { Request, Response, NextFunction } from 'express';

// Custom error class for thrown API errors
export class ApiError extends Error {
  statusCode: number;
  
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === 'ZodError') {
    // If we wanted to catch global Zod errors here
    statusCode = 400;
    message = 'Validation Error';
  } else {
    // Log unexpected errors
    console.error('🔥 [Unhandled Error]:', err);
  }

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
