import { Router, Request, Response, NextFunction } from 'express';
import { EventVisibility, ROLE } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { ensureCanManageEvent } from '../utils/authorization';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const createEventSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  timeBegin: z.string().datetime(),
  timeEnd: z.string().datetime().optional(),
  placeId: z.number().int().positive(),
  communityId: z.number().int().positive().optional(),
  minAge: z.number().int().min(0).max(100).default(18),
  externalUrl: z.string().url().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PRIVATE'),
});

const updateEventSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  timeBegin: z.string().datetime().optional(),
  timeEnd: z.string().datetime().optional(),
  minAge: z.number().int().min(0).max(100).optional(),
  status: z.string().max(20).optional(),
  externalUrl: z.string().url().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
});

// ==================== EVENTS CRUD ====================

// GET /api/events - Get all events with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      placeId,
      communityId,
      organizerId,
      status,
      visibility,
      minAge,
      timeBegin,
      timeEnd,
      page = '1',
      limit = '10',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (placeId) {
      const placeIdNum = parseInt(placeId as string, 10);
      if (!isNaN(placeIdNum)) {
        where.placeId = placeIdNum;
      }
    }

    if (communityId) {
      const communityIdNum = parseInt(communityId as string, 10);
      if (!isNaN(communityIdNum)) {
        where.communityId = communityIdNum;
      }
    }

    if (organizerId) {
      const organizerIdNum = parseInt(organizerId as string, 10);
      if (!isNaN(organizerIdNum)) {
        where.organizerId = organizerIdNum;
      }
    }

    if (status) {
      where.status = status;
    }

    if (visibility && (visibility === 'PUBLIC' || visibility === 'PRIVATE')) {
      where.visibility = visibility;
    }

    if (minAge) {
      const minAgeNum = parseInt(minAge as string, 10);
      if (!isNaN(minAgeNum)) {
        where.minAge = { lte: minAgeNum };
      }
    }

    const timeFilters: { gte?: Date; lte?: Date } = {};

    if (timeBegin) {
      const beginDate = new Date(timeBegin as string);
      if (!Number.isNaN(beginDate.getTime())) {
        timeFilters.gte = beginDate;
      }
    }

    if (timeEnd) {
      const endDate = new Date(timeEnd as string);
      if (!Number.isNaN(endDate.getTime())) {
        timeFilters.lte = endDate;
      }
    }

    if (Object.keys(timeFilters).length > 0) {
      where.timeBegin = timeFilters;
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          place: {
            select: {
              id: true,
              name: true,
              direction: true,
              city: true,
              country: true,
              type: true,
            },
          },
          organizer: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
              image: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              tickets: true,
              reviews: true,
              invitations: true,
              attendees: true,
            },
          },
        },
        orderBy: {
          timeBegin: 'asc',
        },
      }),
      prisma.event.count({ where }),
    ]);

    res.json({
      data: events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/events/:id - Get event by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const eventId = parseInt(id, 10);

    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        place: {
          select: {
            id: true,
            name: true,
            direction: true,
            city: true,
            country: true,
            capacity: true,
            type: true,
            mapUrl: true,
            image: true,
          },
        },
        organizer: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
        tickets: {
          include: {
            promotions: {
              where: {
                timeBegin: { lte: new Date() },
                OR: [
                  { timeEnd: { gte: new Date() } },
                  { timeEnd: null },
                ],
              },
            },
          },
        },
        reviews: {
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
          orderBy: {
            createdAt: 'desc',
          },
        },
        attendees: {
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
        _count: {
          select: {
            tickets: true,
            reviews: true,
            invitations: true,
            attendees: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// POST /api/events - Create new event
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = createEventSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { placeId, communityId, timeBegin, timeEnd, visibility, ...eventData } = validation.data;

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const organizerId = req.user.userId;

    if (visibility === 'PUBLIC' && !communityId) {
      return res
        .status(400)
        .json({ error: 'A public event must be associated with a community' });
    }

    if (communityId) {
      const community = await prisma.community.findUnique({
        where: { id: communityId },
      });

      if (!community) {
        return res.status(404).json({ error: 'Community not found' });
      }
    }

    const event = await prisma.event.create({
      data: {
        ...eventData,
        timeBegin: new Date(timeBegin),
        timeEnd: timeEnd ? new Date(timeEnd) : null,
        placeId,
        organizerId,
        communityId,
        status: 'proximo',
        visibility,
      },
      include: {
        place: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        organizer: {
          select: {
            id: true,
            name: true,
            lastName: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Evento creado exitosamente',
      event,
    });
  } catch (error) {
    console.error('Error creating event:', error);
    next(error);
  }
});

// PUT /api/events/:id - Update event
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const eventId = parseInt(id, 10);

    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const managedEvent = await ensureCanManageEvent(req.user, eventId);

    const validation = updateEventSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    if (validation.data.status && req.user?.role !== ROLE.ADMIN) {
      return res.status(403).json({ error: 'Only admins can change event status' });
    }

    const { timeBegin, timeEnd, ...rest } = validation.data;

    if (rest.visibility === 'PUBLIC' && !managedEvent.communityId) {
      return res
        .status(400)
        .json({ error: 'A public event must belong to a community' });
    }

    const updateData: any = { ...rest };

    if (timeBegin) {
      updateData.timeBegin = new Date(timeBegin);
    }

    if (timeEnd) {
      updateData.timeEnd = new Date(timeEnd);
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: {
        place: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        organizer: {
          select: {
            id: true,
            name: true,
            lastName: true,
          },
        },
      },
    });

    res.json(event);
  } catch (error: any) {
    console.error('Error updating event:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Event not found' });
    }

    next(error);
  }
});

// POST /api/events/:id/join - Join a public community event
router.post('/:id/join', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const eventId = parseInt(id, 10);

    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        visibility: true,
        communityId: true,
        status: true,
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.visibility !== EventVisibility.PUBLIC) {
      return res.status(403).json({ error: 'This event is not open for public joining' });
    }

    if (!event.communityId) {
      return res.status(403).json({ error: 'This event is private' });
    }

    if (['finalizado', 'cancelado'].includes(event.status)) {
      return res.status(400).json({ error: 'Cannot join an event that is not active' });
    }

    const userId = req.user!.userId;

    const membership = await prisma.community_Member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId: event.communityId,
        },
      },
      select: {
        exitAt: true,
      },
    });

    if (!membership || membership.exitAt) {
      return res.status(403).json({ error: 'You must belong to the community to join this event' });
    }

    const existingAttendance = await prisma.eventAttendee.findUnique({
      where: {
        eventId_userId: {
          eventId: event.id,
          userId,
        },
      },
    });

    if (existingAttendance) {
      return res.status(200).json({ message: 'Already joined this event' });
    }

    const attendance = await prisma.eventAttendee.create({
      data: {
        eventId: event.id,
        userId,
      },
    });

    res.status(201).json({
      message: 'Te has unido al evento correctamente',
      attendance,
    });
  } catch (error) {
    console.error('Error joining event:', error);
    next(error);
  }
});

// DELETE /api/events/:id - Delete event
router.delete(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const eventId = parseInt(id, 10);

      if (isNaN(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID' });
      }

      await ensureCanManageEvent(req.user, eventId);

      const deleted = await prisma.event.delete({
        where: { id: eventId },
      });

      res.status(200).json({
        message: `Evento '${deleted.name}' eliminado exitosamente`,
        id: deleted.id,
      });
    } catch (error: any) {
      console.error('Error deleting event:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Event not found' });
      }

      next(error);
    }
  },
);

export default router;
