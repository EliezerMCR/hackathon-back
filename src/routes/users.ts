import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { updateUserSchema } from '../schemas/userSchemas';
import { HTTP404Error, HTTP409Error } from '../utils/errors';

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

router.get('/', authenticate, async (req: any, res: any, next) => {
  try {
    const requesterRole = req.user?.role;
    if (requesterRole === 'ADMIN') {
      const users = await prisma.user.findMany();
      return res.json(users);
    }
    // public view for non-admins
    const publicUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        lastName: true,
        image: true,
        city: true,
        country: true,
        membership: true,
        createdAt: true,
      },
    });
    res.json(publicUsers);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req: any, res: any, next) => {
  try {
    const { id } = req.params;
    const requestedId = parseInt(id, 10);

    if (isNaN(requestedId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const requesterRole = req.user?.role;

    if (requesterRole === 'ADMIN') {
      const user = await prisma.user.findUnique({ where: { id: requestedId } });
      if (!user) return next(new HTTP404Error('User not found'));
      return res.json(user);
    }

    // public view for non-admins
    const publicUser = await prisma.user.findUnique({
      where: { id: requestedId },
      select: {
        id: true,
        name: true,
        lastName: true,
        image: true,
        city: true,
        country: true,
        membership: true,
        createdAt: true,
      },
    });

    if (!publicUser) return next(new HTTP404Error('User not found'));

    res.json(publicUser);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/invitations', authenticate, async (req: any, res: any, next) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (req.user.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const prismaAny = prisma as any;
    const invitations = await prismaAny.communityInvitation.findMany({
      where: { invitedUserId: userId },
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(invitations);
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

router.get('/member/:userId', async (req: Request, res: Response, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    const memberships = await prisma.community_Member.findMany({
      where: { userId },
      include: {
        community: true,
      },
    });

    const communities = memberships.map(m => ({
      id: m.community.id,
      name: m.community.name,
      role: m.role,
      joinedAt: m.createdAt,
    }));

    res.json({ communities });
  } catch (error) {
    next(error);
  }
});

export default router;