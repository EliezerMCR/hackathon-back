import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';
import {
  ensureCanManageProduct,
  ensureCanManagePromotion,
  ensureCanManageTicket,
} from '../utils/authorization';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const createPromotionSchema = z.object({
  type: z.enum(['PRODUCT', 'TICKET']),
  productId: z.number().int().positive().optional(),
  ticketId: z.number().int().positive().optional(),
  membership: z.enum(['NORMAL', 'VIP']).default('NORMAL'),
  discount: z.number().int().min(1).max(100),
  timeBegin: z.string().datetime(),
  timeEnd: z.string().datetime().optional(),
});

const updatePromotionSchema = z.object({
  discount: z.number().int().min(1).max(100).optional(),
  timeBegin: z.string().datetime().optional(),
  timeEnd: z.string().datetime().optional(),
  membership: z.enum(['NORMAL', 'VIP']).optional(),
});

// ==================== PROMOTIONS CRUD ====================

// GET /api/promotions - Get all promotions (with filters)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, membership, active } = req.query;

    const where: any = {};

    if (type && ['PRODUCT', 'TICKET'].includes(type as string)) {
      where.type = type;
    }

    if (membership && ['NORMAL', 'VIP'].includes(membership as string)) {
      where.membership = membership;
    }

    // Filter active promotions
    if (active === 'true') {
      const now = new Date();
      where.timeBegin = { lte: now };
      where.OR = [{ timeEnd: { gte: now } }, { timeEnd: null }];
    }

    const promotions = await prisma.promotion.findMany({
      where,
      include: {
        product: {
          include: {
            place: {
              select: {
                id: true,
                name: true,
                city: true,
              },
            },
          },
        },
        ticket: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                timeBegin: true,
              },
            },
          },
        },
      },
      orderBy: {
        timeBegin: 'desc',
      },
    });

    res.json(promotions);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ error: 'Failed to fetch promotions' });
  }
});

// GET /api/promotions/:id - Get promotion by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const promotionId = parseInt(id, 10);

    if (isNaN(promotionId)) {
      return res.status(400).json({ error: 'Invalid promotion ID' });
    }

    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
      include: {
        product: {
          include: {
            place: true,
          },
        },
        ticket: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    res.json(promotion);
  } catch (error) {
    console.error('Error fetching promotion:', error);
    res.status(500).json({ error: 'Failed to fetch promotion' });
  }
});

// POST /api/promotions - Create new promotion
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = createPromotionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { type, productId, ticketId, timeBegin, timeEnd, ...rest } = validation.data;

    if (type === 'PRODUCT') {
      if (!productId) {
        return res.status(400).json({ error: 'productId is required for PRODUCT promotions' });
      }
      await ensureCanManageProduct(req.user, productId);
    } else {
      if (!ticketId) {
        return res.status(400).json({ error: 'ticketId is required for TICKET promotions' });
      }
      await ensureCanManageTicket(req.user, ticketId);
    }

    const promotion = await prisma.promotion.create({
      data: {
        ...rest,
        type,
        productId,
        ticketId,
        timeBegin: new Date(timeBegin),
        timeEnd: timeEnd ? new Date(timeEnd) : null,
      },
      include: {
        product: {
          include: {
            place: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        ticket: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      message: 'Promoción creada exitosamente',
      promotion,
    });
  } catch (error) {
    console.error('Error creating promotion:', error);
    next(error);
  }
});

// PUT /api/promotions/:id - Update promotion
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const promotionId = parseInt(id, 10);

    if (isNaN(promotionId)) {
      return res.status(400).json({ error: 'Invalid promotion ID' });
    }

    await ensureCanManagePromotion(req.user, promotionId);

    const validation = updatePromotionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { timeBegin, timeEnd, ...rest } = validation.data;

    const updateData: any = { ...rest };

    if (timeBegin) {
      updateData.timeBegin = new Date(timeBegin);
    }

    if (timeEnd) {
      updateData.timeEnd = new Date(timeEnd);
    }

    const promotion = await prisma.promotion.update({
      where: { id: promotionId },
      data: updateData,
      include: {
        product: {
          include: {
            place: true,
          },
        },
        ticket: {
          include: {
            event: true,
          },
        },
      },
    });

    res.json(promotion);
  } catch (error: any) {
    console.error('Error updating promotion:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    next(error);
  }
});

// DELETE /api/promotions/:id - Delete promotion
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const promotionId = parseInt(id, 10);

    if (isNaN(promotionId)) {
      return res.status(400).json({ error: 'Invalid promotion ID' });
    }

    await ensureCanManagePromotion(req.user, promotionId);

    const deleted = await prisma.promotion.delete({
      where: { id: promotionId },
    });

    res.status(200).json({
      message: `Promoción eliminada exitosamente`,
      id: deleted.id,
      type: deleted.type,
      discount: deleted.discount,
    });
  } catch (error: any) {
    console.error('Error deleting promotion:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    next(error);
  }
});

export default router;
