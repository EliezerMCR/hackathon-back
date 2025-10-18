import { Router, Request, Response, NextFunction } from 'express';
import { ROLE } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { ensureCanManageEvent, ensureCanManagePlace, ensureRole } from '../utils/authorization';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const createEventSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  timeBegin: z.string().datetime(),
  timeEnd: z.string().datetime().optional(),
  placeId: z.number().int().positive(),
  organizerId: z.number().int().positive(),
  communityId: z.number().int().positive().optional(),
  minAge: z.number().int().min(0).max(100).default(18),
  externalUrl: z.string().url().optional(),
});

const updateEventSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  timeBegin: z.string().datetime().optional(),
  timeEnd: z.string().datetime().optional(),
  minAge: z.number().int().min(0).max(100).optional(),
  status: z.string().max(20).optional(),
  externalUrl: z.string().url().optional(),
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
        _count: {
          select: {
            tickets: true,
            reviews: true,
            invitations: true,
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

    const { placeId, organizerId, communityId, timeBegin, timeEnd, ...eventData } =
      validation.data;

    const actor = ensureRole(req.user, [ROLE.ADMIN, ROLE.MARKET]);

    if (actor.role === ROLE.MARKET && organizerId !== actor.userId) {
      return res.status(403).json({ error: 'Markets can only organize events for themselves' });
    }

    await ensureCanManagePlace(req.user, placeId);

    // Verify organizer exists (admins might create for other organizers)
    const organizer = await prisma.user.findUnique({
      where: { id: organizerId },
    });

    if (!organizer) {
      return res.status(404).json({ error: 'Organizer user not found' });
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

    await ensureCanManageEvent(req.user, eventId);

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
