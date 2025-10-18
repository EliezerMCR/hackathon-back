import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { createUserSchema, updateUserSchema } from '../schemas/userSchemas';
import { HTTP404Error, HTTP409Error } from '../utils/errors';
import bcrypt from 'bcryptjs';

const router = Router();

router.get('/me', authenticate, async (req: any, res: any, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return next(new HTTP404Error('User not found'));
    }

    const { id, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

router.put('/me', authenticate, validate(updateUserSchema), async (req: any, res: any, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: req.body,
    });

    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return next(new HTTP404Error('User not found'));
    }
    if (error.code === 'P2002') {
      return next(new HTTP409Error('Email already exists'));
    }
    next(error);
  }
});

router.delete('/me', authenticate, async (req: any, res: any, next) => {
  try {
    await prisma.user.delete({
      where: { id: req.user.userId },
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return next(new HTTP404Error('User not found'));
    }
    next(error);
  }
});

router.get('/', authenticate, authorize(['ADMIN']), async (req: any, res: any, next) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, authorize(['ADMIN']), async (req: any, res: any, next) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!user) {
      return next(new HTTP404Error('User not found'));
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, authorize(['ADMIN']), validate(updateUserSchema), async (req: any, res: any, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: req.body,
    });

    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return next(new HTTP404Error('User not found'));
    }
    if (error.code === 'P2002') {
      return next(new HTTP409Error('Email already exists'));
    }
    next(error);
  }
});

router.delete('/:id', authenticate, authorize(['ADMIN']), async (req: any, res: any, next) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return next(new HTTP404Error('User not found'));
    }
    next(error);
  }
});

export default router;