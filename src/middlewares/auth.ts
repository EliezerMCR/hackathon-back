
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HTTP401Error, HTTP403Error } from '../utils/errors';

interface AuthRequest extends Request {
  user?: { userId: number; role: string };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return next(new HTTP401Error('Access denied. No token provided'));
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded as { userId: number; role: string };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new HTTP401Error('Token expired'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new HTTP401Error('Invalid token'));
    }
    next(error);
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HTTP403Error('Access denied'));
    }
    next();
  };
};
