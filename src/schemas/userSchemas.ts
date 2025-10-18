import { z } from 'zod';
import { Gender } from '@prisma/client';

const roleEnum = z.enum(['ADMIN', 'MARKET', 'CLIENT']);
const membershipEnum = z.enum(['NORMAL', 'VIP']);
const genderEnum = z.enum(['MAN', 'WOMAN', 'OTHER']);

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  password: z.string().min(8),
  role: roleEnum,
});

export const updateUserSelfSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().min(8).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  image: z.string().optional(),
  documentId: z.number().int().nonnegative().optional(),
});

export const updateUserSchema = updateUserSelfSchema.extend({
  role: roleEnum.optional(),
  membership: membershipEnum.optional(),
  gender: genderEnum.optional(),
  birthDate: z.string().optional(),
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
