import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { ensureSelfOrAdmin } from '../utils/authorization';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const createReviewSchema = z.object({
  placeId: z.number().int().positive(),
  eventId: z.number().int().positive().optional(),
  calification: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

const updateReviewSchema = z.object({
  calification: z.number().int().min(1).max(5).optional(),
  comment: z.string().optional(),
});

// ==================== REVIEWS CRUD ====================

// GET /api/reviews - Get all reviews (with filters)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, placeId, eventId } = req.query;

    const where: any = {};

    if (userId) {
      const userIdNum = parseInt(userId as string, 10);
      if (!isNaN(userIdNum)) {
        where.userId = userIdNum;
      }
    }

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

    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
          },
        },
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
            timeBegin: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET /api/reviews/place/:placeId/stats - Get place rating statistics
router.get('/place/:placeId/stats', async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params;
    const placeIdNum = parseInt(placeId, 10);

    if (isNaN(placeIdNum)) {
      return res.status(400).json({ error: 'Invalid place ID' });
    }

    const reviews = await prisma.review.findMany({
      where: { placeId: placeIdNum },
      select: { calification: true },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.calification, 0) / totalReviews
        : 0;

    // Distribution of ratings
    const distribution = {
      5: reviews.filter((r) => r.calification === 5).length,
      4: reviews.filter((r) => r.calification === 4).length,
      3: reviews.filter((r) => r.calification === 3).length,
      2: reviews.filter((r) => r.calification === 2).length,
      1: reviews.filter((r) => r.calification === 1).length,
    };

    res.json({
      placeId: placeIdNum,
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      distribution,
    });
  } catch (error) {
    console.error('Error fetching place stats:', error);
    res.status(500).json({ error: 'Failed to fetch place statistics' });
  }
});

// GET /api/reviews/event/:eventId/stats - Get event rating statistics
router.get('/event/:eventId/stats', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const eventIdNum = parseInt(eventId, 10);

    if (isNaN(eventIdNum)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const reviews = await prisma.review.findMany({
      where: { eventId: eventIdNum },
      select: { calification: true },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.calification, 0) / totalReviews
        : 0;

    // Distribution of ratings
    const distribution = {
      5: reviews.filter((r) => r.calification === 5).length,
      4: reviews.filter((r) => r.calification === 4).length,
      3: reviews.filter((r) => r.calification === 3).length,
      2: reviews.filter((r) => r.calification === 2).length,
      1: reviews.filter((r) => r.calification === 1).length,
    };

    res.json({
      eventId: eventIdNum,
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      distribution,
    });
  } catch (error) {
    console.error('Error fetching event stats:', error);
    res.status(500).json({ error: 'Failed to fetch event statistics' });
  }
});

// GET /api/reviews/:id - Get review by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reviewId = parseInt(id, 10);

    if (isNaN(reviewId)) {
      return res.status(400).json({ error: 'Invalid review ID' });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
          },
        },
        place: true,
        event: true,
      },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// POST /api/reviews - Create new review
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = createReviewSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { placeId, eventId, calification, comment } = validation.data;
    const userId = req.user!.userId;

    // Verify place exists
    const place = await prisma.place.findUnique({ where: { id: placeId } });
    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    // Verify event exists if provided
    if (eventId) {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
    }

    const review = await prisma.review.create({
      data: {
        userId,
        placeId,
        eventId,
        calification,
        comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
          },
        },
        place: {
          select: {
            id: true,
            name: true,
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
      message: 'Review creado exitosamente',
      review,
    });
  } catch (error) {
    console.error('Error creating review:', error);
    next(error);
  }
});

// PUT /api/reviews/:id - Update review
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const reviewId = parseInt(id, 10);

    if (isNaN(reviewId)) {
      return res.status(400).json({ error: 'Invalid review ID' });
    }

    const validation = updateReviewSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { userId: true },
    });

    if (!existingReview) {
      return res.status(404).json({ error: 'Review not found' });
    }

    ensureSelfOrAdmin(req.user, existingReview.userId);

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: validation.data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
          },
        },
        place: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(review);
  } catch (error: any) {
    console.error('Error updating review:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Review not found' });
    }

    next(error);
  }
});

// DELETE /api/reviews/:id - Delete review
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const reviewId = parseInt(id, 10);

    if (isNaN(reviewId)) {
      return res.status(400).json({ error: 'Invalid review ID' });
    }

    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!existingReview) {
      return res.status(404).json({ error: 'Review not found' });
    }

    ensureSelfOrAdmin(req.user, existingReview.userId);

    const deleted = await prisma.review.delete({
      where: { id: reviewId },
    });

    res.status(200).json({
      message: `Review eliminado exitosamente`,
      id: deleted.id,
      userId: deleted.userId,
      placeId: deleted.placeId,
    });
  } catch (error: any) {
    console.error('Error deleting review:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Review not found' });
    }

    next(error);
  }
});

export default router;
