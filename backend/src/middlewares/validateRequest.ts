import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse the incoming request payload against the schema
      // We parse body, query, and params in case the schema defines them
      const parsedData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (parsedData.body !== undefined) {
        req.body = parsedData.body;
      }
      if (parsedData.query !== undefined) {
        req.query = parsedData.query;
      }
      if (parsedData.params !== undefined) {
        req.params = parsedData.params;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Invalid input',
          errors: error.flatten().fieldErrors,
        });
      }
      next(error);
    }
  };
};
