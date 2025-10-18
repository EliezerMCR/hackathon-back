import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const createPlaceSchema = z.object({
  name: z.string().min(1).max(255),
  direction: z.string().min(1),
  city: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  capacity: z.number().int().positive().optional(),
  type: z.string().max(50).optional(),
  proprietorId: z.number().int().positive().optional(),
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
          proprietor: {
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
        proprietor: {
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
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = createPlaceSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const data = validation.data;

    // Verify proprietor exists if provided
    if (data.proprietorId) {
      const proprietor = await prisma.user.findUnique({
        where: { id: data.proprietorId },
      });

      if (!proprietor) {
        return res.status(404).json({ error: 'Proprietor user not found' });
      }
    }

    const place = await prisma.place.create({
      data,
      include: {
        proprietor: {
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
    res.status(500).json({ error: 'Failed to create place' });
  }
});

// PUT /api/places/:id - Update place
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const placeId = parseInt(id, 10);

    if (isNaN(placeId)) {
      return res.status(400).json({ error: 'Invalid place ID' });
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
        proprietor: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.json(place);
  } catch (error: any) {
    console.error('Error updating place:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.status(500).json({ error: 'Failed to update place' });
  }
});

// DELETE /api/places/:id - Delete place
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const placeId = parseInt(id, 10);

    if (isNaN(placeId)) {
      return res.status(400).json({ error: 'Invalid place ID' });
    }

    const deleted = await prisma.place.delete({
      where: { id: placeId },
    });

    res.status(200).json({
      message: `Place '${deleted.name}' eliminado exitosamente`,
      id: deleted.id,
    });
  } catch (error: any) {
    console.error('Error deleting place:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.status(500).json({ error: 'Failed to delete place' });
  }
});

export default router;
