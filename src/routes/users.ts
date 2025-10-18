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

// Get places owned by the authenticated user
router.get('/me/places', authenticate, async (req: any, res: any, next) => {
  try {
    const userId = req.user.userId;

    const places = await prisma.place.findMany({
      where: { ownerId: userId },
      include: {
        products: true,
        events: true,
        reviews: true,
      },
    });

    res.json(places);
  } catch (error) {
    next(error);
  }
});

// Get events organized by the authenticated user
router.get('/me/events', authenticate, async (req: any, res: any, next) => {
  try {
    const userId = req.user.userId;

    const events = await prisma.event.findMany({
      where: { organizerId: userId },
      include: {
        place: true,
        community: true,
        tickets: true,
      },
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

// Get communities where the authenticated user is a member
router.get('/me/communities', authenticate, async (req: any, res: any, next) => {
  try {
    const userId = req.user.userId;

    const memberships = await prisma.community_Member.findMany({
      where: { userId },
      include: {
        community: {
          include: {
            events: true,
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    lastName: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const communities = memberships.map(cm => ({
      ...cm.community,
      role: cm.role,
      joinedAt: cm.createdAt,
      exitedAt: cm.exitAt,
    }));

    res.json(communities);
  } catch (error) {
    next(error);
  }
});

// Get tickets bought by the authenticated user
router.get('/me/tickets', authenticate, async (req: any, res: any, next) => {
  try {
    const userId = req.user.userId;

    const boughtTickets = await prisma.bought_Ticket.findMany({
      where: { userId },
      include: {
        ticket: {
          include: {
            event: {
              include: {
                place: true,
              },
            },
          },
        },
      },
    });

    res.json(boughtTickets);
  } catch (error) {
    next(error);
  }
});

// Get reviews made by the authenticated user
router.get('/me/reviews', authenticate, async (req: any, res: any, next) => {
  try {
    const userId = req.user.userId;

    const reviews = await prisma.review.findMany({
      where: { userId },
      include: {
        place: true,
        event: true,
      },
    });

    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

// Get invitations sent by the authenticated user
router.get('/me/invitations/sent', authenticate, async (req: any, res: any, next) => {
  try {
    const userId = req.user.userId;

    const invitations = await prisma.invitation.findMany({
      where: { fromId: userId },
      include: {
        to: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        event: true,
        place: true,
      },
    });

    res.json(invitations);
  } catch (error) {
    next(error);
  }
});

// Get invitations received by the authenticated user
router.get('/me/invitations/received', authenticate, async (req: any, res: any, next) => {
  try {
    const userId = req.user.userId;

    const invitations = await prisma.invitation.findMany({
      where: { toId: userId },
      include: {
        from: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        event: true,
        place: true,
      },
    });

    res.json(invitations);
  } catch (error) {
    next(error);
  }
});

// Get requests sent by the authenticated user
router.get('/me/requests/sent', authenticate, async (req: any, res: any, next) => {
  try {
    const userId = req.user.userId;

    const requests = await prisma.request.findMany({
      where: { fromId: userId },
      include: {
        community: true,
        acceptedBy: {
          select: {
            id: true,
            name: true,
            lastName: true,
          },
        },
      },
    });

    res.json(requests);
  } catch (error) {
    next(error);
  }
});

// Get requests received/managed by the authenticated user
router.get('/me/requests/received', authenticate, async (req: any, res: any, next) => {
  try {
    const userId = req.user.userId;

    const requests = await prisma.request.findMany({
      where: { acceptedById: userId },
      include: {
        from: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        community: true,
      },
    });

    res.json(requests);
  } catch (error) {
    next(error);
  }
});

// Get notifications for the authenticated user
router.get('/me/notifications', authenticate, async (req: any, res: any, next) => {
  try {
    const userId = req.user.userId;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(notifications);
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

router.get('/:id/content', authenticate, async (req: any, res: any, next) => {
  try {
    const { id } = req.params;
    const requestedId = parseInt(id, 10);

    if (isNaN(requestedId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Verify user exists
    const userExists = await prisma.user.findUnique({
      where: { id: requestedId },
    });

    if (!userExists) {
      return next(new HTTP404Error('User not found'));
    }

    // Get public content related to the user
    const [
      places,
      organizedEvents,
      reviews,
    ] = await Promise.all([
      // Places owned by user (only accepted ones for public view)
      prisma.place.findMany({
        where: { 
          ownerId: requestedId,
          status: 'ACCEPTED',
        },
        include: {
          products: true,
          reviews: {
            select: {
              id: true,
              calification: true,
              comment: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  lastName: true,
                  image: true,
                },
              },
            },
          },
        },
      }),
      // Events organized by user
      prisma.event.findMany({
        where: { organizerId: requestedId },
        include: {
          place: {
            select: {
              id: true,
              name: true,
              city: true,
              country: true,
              image: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
            },
          },
          tickets: true,
        },
      }),
      // Reviews made by user
      prisma.review.findMany({
        where: { userId: requestedId },
        include: {
          place: {
            select: {
              id: true,
              name: true,
              city: true,
              country: true,
              image: true,
            },
          },
          event: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const communities = await prisma.community_Member.findMany({
      where: { 
        userId: requestedId,
        exitAt: null, // Only active memberships
      },
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({
      places,
      organizedEvents,
      communities: communities.map(cm => ({
        id: cm.community.id,
        name: cm.community.name,
        role: cm.role,
        joinedAt: cm.createdAt,
      })),
      reviews,
    });
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
