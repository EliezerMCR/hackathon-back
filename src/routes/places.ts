import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middlewares/auth';
import { HTTP403Error, HTTP404Error } from '../utils/errors';
import { processImages } from '../middlewares/imageProcessor';
import { deleteImage } from '../utils/blob-storage';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const createPlaceSchema = z.object({
  name: z.string().min(1).max(255),
  direction: z.string().min(1),
  city: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  capacity: z.number().int().positive().optional(),
  type: z.string().max(50).optional(),
  ownerId: z.number().int().positive().optional(),
  mapUrl: z.string().url().optional(),
  igUrl: z.string().url().optional(),
  facebookUrl: z.string().url().optional(),
  tiktokUrl: z.string().url().optional(),
  image: z.string().optional(),
});

const updatePlaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  direction: z.string().min(1).optional(),
  city: z.string().min(1).max(100).optional(),
  country: z.string().min(1).max(100).optional(),
  capacity: z.number().int().positive().optional(),
  type: z.string().max(50).optional(),
  mapUrl: z.string().url().optional(),
  igUrl: z.string().url().optional(),
  facebookUrl: z.string().url().optional(),
  tiktokUrl: z.string().url().optional(),
  image: z.string().optional(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']).optional(),
});

// ==================== PLACES CRUD ====================

// GET /api/places - Get all places with filters and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const { city, country, type, status, page = '1', limit = '10' } = req.query;
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (city) {
      where.city = { contains: city as string, mode: 'insensitive' };
    }
    if (country) {
      where.country = { contains: country as string, mode: 'insensitive' };
    }
    if (type) {
      where.type = { contains: type as string, mode: 'insensitive' };
    }
    if (status && ['PENDING', 'ACCEPTED', 'REJECTED'].includes(status as string)) {
      where.status = status;
    }

    const [places, total] = await Promise.all([
      prisma.place.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              products: true,
              events: true,
              reviews: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.place.count({ where }),
    ]);

    res.json({
      data: places,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
});

// GET /api/places/:id - Get place by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const placeId = parseInt(id, 10);

    if (isNaN(placeId)) {
      return res.status(400).json({ error: 'Invalid place ID' });
    }

    const place = await prisma.place.findUnique({
      where: { id: placeId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        products: {
          include: {
            promotions: true,
          },
        },
        events: {
          select: {
            id: true,
            name: true,
            description: true,
            timeBegin: true,
            timeEnd: true,
            status: true,
            minAge: true,
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
            products: true,
            events: true,
            reviews: true,
          },
        },
      },
    });

    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.json(place);
  } catch (error) {
    console.error('Error fetching place:', error);
    res.status(500).json({ error: 'Failed to fetch place' });
  }
});

// POST /api/places - Create new place
router.post('/', authenticate, authorize(['ADMIN', 'MARKET']), processImages(['image']), async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const validation = createPlaceSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const data = validation.data;
    const requester = req.user;
    const resolvedOwnerId = data.ownerId ?? requester.userId;

    if (requester.role === 'MARKET' && resolvedOwnerId !== requester.userId) {
      return next(new HTTP403Error('Markets can only create places for themselves'));
    }

    const owner = await prisma.user.findUnique({ where: { id: resolvedOwnerId } });
    if (!owner) {
      return next(new HTTP404Error('Owner user not found'));
    }

    const place = await prisma.place.create({
      data: {
        ...data,
        ownerId: resolvedOwnerId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Place creado exitosamente',
      place,
    });
  } catch (error) {
    console.error('Error creating place:', error);
    next(error);
  }
});

// PUT /api/places/:id - Update place
router.put('/:id', authenticate, processImages(['image']), async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const placeId = parseInt(id, 10);

    if (isNaN(placeId)) {
      return res.status(400).json({ error: 'Invalid place ID' });
    }

    const existingPlace = await prisma.place.findUnique({ 
      where: { id: placeId },
      select: { id: true, ownerId: true, image: true }
    });
    if (!existingPlace) {
      return next(new HTTP404Error('Place not found'));
    }

    const requester = req.user;
    if (requester.role !== 'ADMIN' && existingPlace.ownerId !== requester.userId) {
      return next(new HTTP403Error('You are not allowed to update this place'));
    }

    const validation = updatePlaceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const place = await prisma.place.update({
      where: { id: placeId },
      data: validation.data,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Delete old image if a new one was uploaded
    if (validation.data.image && existingPlace.image && validation.data.image !== existingPlace.image) {
      await deleteImage(existingPlace.image);
    }

    res.json(place);
  } catch (error) {
    console.error('Error updating place:', error);
    next(error);
  }
});

// DELETE /api/places/:id - Delete place
router.delete('/:id', authenticate, async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const placeId = parseInt(id, 10);

    if (isNaN(placeId)) {
      return res.status(400).json({ error: 'Invalid place ID' });
    }

    const existingPlace = await prisma.place.findUnique({ where: { id: placeId } });
    if (!existingPlace) {
      return next(new HTTP404Error('Place not found'));
    }

    const requester = req.user;
    if (requester.role !== 'ADMIN' && existingPlace.ownerId !== requester.userId) {
      return next(new HTTP403Error('You are not allowed to delete this place'));
    }

    const deleted = await prisma.place.delete({ where: { id: placeId } });

    res.status(200).json({
      message: `Place '${deleted.name}' eliminado exitosamente`,
      id: deleted.id,
    });
  } catch (error) {
    console.error('Error deleting place:', error);
    next(error);
  }
});

export default router;
