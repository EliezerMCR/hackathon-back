
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ROLE } from '@prisma/client';
import { HTTP401Error, HTTP403Error } from '../utils/errors';

export interface AuthUser {
  userId: number;
  role: ROLE;
}

export type AuthRequest = Request & { user?: AuthUser };

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

    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload & Partial<AuthUser>;

    if (typeof decoded !== 'object' || typeof decoded.userId !== 'number' || !decoded.role) {
      return next(new HTTP401Error('Invalid token payload'));
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role as ROLE,
    };
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

export const authorize = (roles: ROLE[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new HTTP403Error('Access denied'));
    }

    if (req.user.role === ROLE.ADMIN) {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return next(new HTTP403Error('Access denied'));
    }
    next();
  };
};
