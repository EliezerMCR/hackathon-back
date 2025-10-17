import { Request, Response, NextFunction } from 'express';
import { BaseError } from '../utils/errors';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof BaseError) {
    return res.status(err.statusCode).json({ error: err.name, message: err.message });
  }

  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
};
