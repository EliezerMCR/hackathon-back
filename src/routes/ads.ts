import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { ensureCanManageAd, ensureCanManageEvent, ensureCanManagePlace } from '../utils/authorization';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const createAdSchema = z.object({
  placeId: z.number().int().positive(),
  eventId: z.number().int().positive().optional(),
  timeBegin: z.string().datetime(),
  timeEnd: z.string().datetime(),
});

const updateAdSchema = z.object({
  timeBegin: z.string().datetime().optional(),
  timeEnd: z.string().datetime().optional(),
});

// ==================== ADS CRUD ====================

// GET /api/ads - Get all ads (with filters)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { placeId, eventId, active } = req.query;

    const where: any = {};

    if (placeId) {
      const placeIdNum = parseInt(placeId as string, 10);
      if (!isNaN(placeIdNum)) {
        where.placeId = placeIdNum;
      }
    }

    if (eventId) {
      const eventIdNum = parseInt(eventId as string, 10);
      if (!isNaN(eventIdNum)) {
        where.eventId = eventIdNum;
      }
    }

    // Filter active ads
    if (active === 'true') {
      const now = new Date();
      where.timeBegin = { lte: now };
      where.timeEnd = { gte: now };
    }

    const ads = await prisma.ad.findMany({
      where,
      include: {
        place: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
            type: true,
            image: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            description: true,
            timeBegin: true,
            timeEnd: true,
            status: true,
          },
        },
      },
      orderBy: {
        timeBegin: 'desc',
      },
    });

    res.json(ads);
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

// GET /api/ads/:id - Get ad by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adId = parseInt(id, 10);

    if (isNaN(adId)) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }

    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      include: {
        place: true,
        event: true,
      },
    });

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    res.json(ad);
  } catch (error) {
    console.error('Error fetching ad:', error);
    res.status(500).json({ error: 'Failed to fetch ad' });
  }
});

// POST /api/ads - Create new ad
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = createAdSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { placeId, eventId, timeBegin, timeEnd } = validation.data;

    await ensureCanManagePlace(req.user, placeId);

    if (eventId) {
      const event = await ensureCanManageEvent(req.user, eventId);
      if (event.placeId !== placeId) {
        return res.status(400).json({ error: 'Event must belong to the selected place' });
      }
    }

    const beginDate = new Date(timeBegin);
    const endDate = new Date(timeEnd);

    if (endDate <= beginDate) {
      return res.status(400).json({ error: 'timeEnd must be after timeBegin' });
    }

    const ad = await prisma.ad.create({
      data: {
        placeId,
        eventId,
        timeBegin: beginDate,
        timeEnd: endDate,
      },
      include: {
        place: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Anuncio creado exitosamente',
      ad,
    });
  } catch (error) {
    console.error('Error creating ad:', error);
    next(error);
  }
});

// PUT /api/ads/:id - Update ad
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const adId = parseInt(id, 10);

    if (isNaN(adId)) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }

    await ensureCanManageAd(req.user, adId);

    const validation = updateAdSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { timeBegin, timeEnd } = validation.data;

    const updateData: any = {};

    if (timeBegin) {
      updateData.timeBegin = new Date(timeBegin);
    }

    if (timeEnd) {
      updateData.timeEnd = new Date(timeEnd);
    }

    const ad = await prisma.ad.update({
      where: { id: adId },
      data: updateData,
      include: {
        place: true,
        event: true,
      },
    });

    res.json(ad);
  } catch (error: any) {
    console.error('Error updating ad:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Ad not found' });
    }

    next(error);
  }
});

// DELETE /api/ads/:id - Delete ad
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const adId = parseInt(id, 10);

    if (isNaN(adId)) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }

    await ensureCanManageAd(req.user, adId);

    const deleted = await prisma.ad.delete({
      where: { id: adId },
    });

    res.status(200).json({
      message: `Anuncio eliminado exitosamente`,
      id: deleted.id,
      placeId: deleted.placeId,
    });
  } catch (error: any) {
    console.error('Error deleting ad:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Ad not found' });
    }

    next(error);
  }
});

export default router;
