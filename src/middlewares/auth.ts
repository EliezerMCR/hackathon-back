
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HTTP401Error, HTTP403Error } from '../utils/errors';

interface AuthRequest extends Request {
  user?: { userId: number; role: string };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return next(new HTTP401Error('Access denied'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded as { userId: number; role: string };
    next();
  } catch (error) {
    next(new HTTP401Error('Invalid token'));
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
