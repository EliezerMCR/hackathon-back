import { z } from 'zod';
import { Gender } from '@prisma/client';

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
  gender: z.nativeEnum(Gender),
  city: z.string().optional(),
  country: z.string().optional(),
  documentId: z.coerce
    .number({ required_error: 'El número de documento es obligatorio.' })
    .int()
    .positive('El número de documento es obligatorio.'),
  documentFrontImage: z.string().min(1, 'La imagen frontal de la cédula es obligatoria.'),
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

