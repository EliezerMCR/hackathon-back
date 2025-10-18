import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { loginSchema, signupSchema, signupWithPrivilegeSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/userSchemas';
import { HTTP401Error, HTTP409Error, HTTP400Error } from '../utils/errors';
import { sendEmail } from '../utils/email';

const router = Router();

router.post('/signup', validate(signupSchema), async (req, res, next) => {
  const { name, lastName, email, password, birthDate, gender, city, country } = req.body;

  try {
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
        documentId: 0,
      },
    });

    res.status(201).json({ message: 'User created successfully' });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return next(new HTTP409Error('User already exists'));
    }
    next(error);
  }
});

router.post('/signup-with-privilege', authenticate, authorize(['ADMIN']), validate(signupWithPrivilegeSchema), async (req, res, next) => {
  const { name, lastName, email, password, birthDate, gender, role, city, country } = req.body;

  try {
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
        documentId: 0,
      },
    });

    res.status(201).json({ message: 'User created successfully' });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return next(new HTTP409Error('User already exists'));
    }
    next(error);
  }
});

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
