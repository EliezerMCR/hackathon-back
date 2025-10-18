import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'MARKET', 'CLIENT']),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['ADMIN', 'MARKET', 'CLIENT']).optional(),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string(),
    lastName: z.string(),
    birthDate: z.string(),
    gender: z.string(),
});

export const signupWithPrivilegeSchema = signupSchema.extend({
    role: z.enum(['ADMIN', 'MARKET']),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8),
  code: z.string().regex(/^\d{6}$/),
});

