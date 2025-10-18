import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import { Gender } from '@prisma/client';
import { ZodError } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { loginSchema, signupSchema, signupWithPrivilegeSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/userSchemas';
import { HTTP401Error, HTTP409Error, HTTP400Error } from '../utils/errors';
import { sendEmail } from '../utils/email';
import { saveBase64ImageToTempFile } from '../services/identity/helpers';
import { verifyIdentityDocumentWithGemini, DocumentVerificationResult } from '../services/identity/documentVerification.service';

const router = Router();

const verifyDocument = async ({
  documentFrontImage,
  fullName,
  expectedDocumentNumber,
}: {
  documentFrontImage: string;
  fullName: string;
  expectedDocumentNumber?: number;
}): Promise<DocumentVerificationResult> => {

  let tempFilePath: string | undefined;

  try {
    let tempFile;
    try {
      tempFile = await saveBase64ImageToTempFile(documentFrontImage, 'signup-document');
    } catch (error) {
      throw new HTTP400Error('El documento enviado no es una imagen válida.');
    }

    tempFilePath = tempFile.filePath;

    let verification: DocumentVerificationResult;
    try {
      verification = await verifyIdentityDocumentWithGemini({
        filePath: tempFile.filePath,
        fullName,
        documentNumber: expectedDocumentNumber ? expectedDocumentNumber.toString() : undefined,
        mimeType: tempFile.mimeType,
      });
    } catch (error) {
      throw new HTTP400Error('No se pudo procesar la cédula enviada.');
    }

    if (!verification.isValid) {
      throw new HTTP400Error('La información de la cédula no coincide con los datos del usuario.');
    }

    if (!verification.extractedDocumentNumberDigits) {
      throw new HTTP400Error('No se pudo extraer el número de documento de la cédula proporcionada.');
    }

    return verification;
  } finally {
    if (tempFilePath) {
      await fs.promises.unlink(tempFilePath).catch(() => undefined);
    }
  }
};

router.post('/signup', async (req, res, next) => {
  try {
    const parsedBody = signupSchema.parse(req.body);

    const {
      name,
      lastName,
      email,
      password,
      birthDate,
      gender,
      city,
      country,
      documentFrontImage,
    } = parsedBody;

    const verification = await verifyDocument({
      documentFrontImage,
      fullName: `${name} ${lastName}`.trim(),
    });

    const documentDigits = verification.extractedDocumentNumberDigits;
    if (!documentDigits) {
      throw new HTTP400Error('No se pudo determinar el número de documento.');
    }

    const documentId = parseInt(documentDigits, 10);
    if (Number.isNaN(documentId)) {
      throw new HTTP400Error('El número de documento detectado es inválido.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name,
        lastName,
        email,
        password: hashedPassword,
        birthDate: new Date(birthDate),
        gender,
        city,
        country,
        role: 'CLIENT',
        documentId,
      },
    });

    res.status(201).json({
      message: 'User created successfully',
      documentVerified: verification.isValid,
      extractedDocumentNumber: verification.formattedExtractedDocumentNumber ?? documentDigits,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return next(new HTTP409Error('User already exists'));
    }
    if (error instanceof HTTP400Error) {
      return next(error);
    }
    if (error instanceof ZodError) {
      return next(new HTTP400Error(error.errors[0]?.message ?? 'Datos inválidos.'));
    }
    next(error);
  }
});

router.post(
  '/signup-with-privilege',
  authenticate,
  authorize(['ADMIN']),
  async (req, res, next) => {
    try {
      const parsedBody = signupWithPrivilegeSchema.parse(req.body);

      const {
        name,
        lastName,
        email,
        password,
        birthDate,
        gender,
        role,
        city,
        country,
        documentFrontImage,
      } = parsedBody;

      const verification = await verifyDocument({
        documentFrontImage,
        fullName: `${name} ${lastName}`.trim(),
      });

      const documentDigits = verification.extractedDocumentNumberDigits;
      if (!documentDigits) {
        throw new HTTP400Error('No se pudo determinar el número de documento.');
      }

      const documentId = parseInt(documentDigits, 10);
      if (Number.isNaN(documentId)) {
        throw new HTTP400Error('El número de documento detectado es inválido.');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: {
          name,
          lastName,
          email,
          password: hashedPassword,
          birthDate: new Date(birthDate),
          gender,
          city,
          country,
          role,
          documentId,
        },
      });

      res.status(201).json({
        message: 'User created successfully',
        documentVerified: verification.isValid,
        extractedDocumentNumber: verification.formattedExtractedDocumentNumber ?? documentDigits,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return next(new HTTP409Error('User already exists'));
      }
      if (error instanceof HTTP400Error) {
        return next(error);
      }
      if (error instanceof ZodError) {
        return next(new HTTP400Error(error.errors[0]?.message ?? 'Datos inválidos.'));
      }
      next(error);
    }
  }
);

router.post('/login', validate(loginSchema), async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return next(new HTTP401Error('Invalid credentials'));
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return next(new HTTP401Error('Invalid credentials'));
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role } as any,
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        role: user.role,
        membership: user.membership,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(200).json({ message: 'If a user with that email exists, a password reset code has been sent.' });
    }

    const resetCode = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const passwordResetToken = crypto.createHash('sha256').update(resetCode).digest('hex');
    const passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { email },
      data: {
        passwordResetToken,
        passwordResetExpires,
      },
    });

    const message = `You are receiving this email because you (or someone else) requested a password reset. Your code is ${resetCode}. It will expire in 1 hour.`;

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Code',
      text: message,
      html: `<p>${message}</p>`,
    });

    res.status(200).json({ message: 'If a user with that email exists, a password reset code has been sent.' });
  } catch (error) {
    next(error);
  }
});

router.put('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
  const { password, code } = req.body;

  try {
    const hashedToken = crypto.createHash('sha256').update(code).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return next(new HTTP400Error('Code is invalid or has expired'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    res.status(200).json({ message: 'Password has been reset' });
  } catch (error) {
    next(error);
  }
});

export default router;
