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

      // Optional: re-assign req.body/query/params to the strictly typed parsed data
      // This is helpful if the schema applies transformations or default values
      req.body = parsedData.body;
      req.query = parsedData.query;
      req.params = parsedData.params;

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
