import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { loginSchema, signupSchema, signupWithPrivilegeSchema } from '../schemas/userSchemas';
import { HTTP400Error, HTTP401Error, HTTP409Error } from '../utils/errors';

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

export default router;
