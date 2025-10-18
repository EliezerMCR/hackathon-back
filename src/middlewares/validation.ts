import { Request, Response, NextFunction } from 'express';
import { z, AnyZodObject } from 'zod';
import { HTTP400Error } from '../utils/errors';

export const validate = (schema: AnyZodObject) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((issue) => ({
        message: `${issue.path.join('.')} is ${issue.message.toLowerCase()}`,
      }));
      next(new HTTP400Error(JSON.stringify(errorMessages)));
    } else {
      next(new HTTP400Error('Invalid data'));
    }
  }
};
