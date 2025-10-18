import { Router, Request, Response, NextFunction } from 'express';
import { ROLE } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest, AuthUser } from '../middlewares/auth';
import { HTTP403Error, HTTP404Error } from '../utils/errors';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const updateRequestSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
});

// ==================== HELPERS ====================

const ensureCommunityManager = async (user: AuthUser | undefined, communityId: number) => {
  if (!user) {
    throw new HTTP403Error('Authentication required');
  }

  if (user.role === ROLE.ADMIN) {
    return;
  }

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: {
      createdById: true,
      members: {
        where: { userId: user.userId },
        select: { role: true },
      },
    },
  });

  if (!community) {
    throw new HTTP404Error('Community not found');
  }

  const memberRole = community.members[0]?.role;

  if (community.createdById === user.userId || memberRole === ROLE.ADMIN) {
    return;
  }

  throw new HTTP403Error('You do not have permission to manage this community request');
};

const ensureRequestAccess = async (
  user: AuthUser | undefined,
  request: { communityId: number; fromId: number },
) => {
  if (!user) {
    throw new HTTP403Error('Authentication required');
  }

  if (user.role === ROLE.ADMIN || request.fromId === user.userId) {
    return;
  }

  await ensureCommunityManager(user, request.communityId);
};

// ==================== REQUESTS MANAGEMENT ====================

// GET /api/requests - Get all requests (optional: filter by user or status)
router.get(
  '/',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, status, communityId } = req.query;

      const where: any = {};

      if (status && ['PENDING', 'ACCEPTED', 'REJECTED'].includes(status as string)) {
        where.status = status;
      }

      if (communityId) {
        const communityIdNum = parseInt(communityId as string, 10);
        if (isNaN(communityIdNum)) {
          return res.status(400).json({ error: 'Invalid community ID' });
        }

        await ensureCommunityManager(req.user, communityIdNum);
        where.communityId = communityIdNum;
      }

      if (userId) {
        const userIdNum = parseInt(userId as string, 10);
        if (isNaN(userIdNum)) {
          return res.status(400).json({ error: 'Invalid user ID' });
        }

        if (req.user?.role !== ROLE.ADMIN && userIdNum !== req.user?.userId) {
          throw new HTTP403Error('You are not allowed to view requests for this user');
        }

        where.fromId = userIdNum;
      }

      if (!communityId && !userId && req.user?.role !== ROLE.ADMIN) {
        where.fromId = req.user!.userId;
      }

      const requests = await prisma.request.findMany({
        where,
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
          community: {
            select: {
              id: true,
              name: true,
            },
          },
          acceptedBy: {
            select: {
              id: true,
              name: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json(requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      next(error);
    }
  },
);

// GET /api/requests/:id - Get request by ID
router.get(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const requestId = parseInt(id, 10);

      if (isNaN(requestId)) {
        return res.status(400).json({ error: 'Invalid request ID' });
      }

      const request = await prisma.request.findUnique({
        where: { id: requestId },
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
          community: {
            select: {
              id: true,
              name: true,
            },
          },
          acceptedBy: {
            select: {
              id: true,
              name: true,
              lastName: true,
            },
          },
        },
      });

      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }

      await ensureRequestAccess(req.user, { communityId: request.communityId, fromId: request.fromId });

      res.json(request);
    } catch (error) {
      console.error('Error fetching request:', error);
      next(error);
    }
  },
);

// PATCH /api/requests/:id - Update request status (Accept/Reject)
router.patch(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const requestId = parseInt(id, 10);

      if (isNaN(requestId)) {
        return res.status(400).json({ error: 'Invalid request ID' });
      }

      const validation = updateRequestSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const { status } = validation.data;

      const existingRequest = await prisma.request.findUnique({
        where: { id: requestId },
      });

      if (!existingRequest) {
        return res.status(404).json({ error: 'Request not found' });
      }

      if (existingRequest.status !== 'PENDING') {
        return res.status(400).json({
          error: `Request already ${existingRequest.status.toLowerCase()}`,
        });
      }

      await ensureCommunityManager(req.user, existingRequest.communityId);

      const acceptedById = req.user!.userId;

      if (status === 'ACCEPTED') {
        await prisma.$transaction(async (tx) => {
          await tx.request.update({
            where: { id: requestId },
            data: {
              status,
              acceptedById,
            },
          });

          await tx.community_Member.upsert({
            where: {
              userId_communityId: {
                userId: existingRequest.fromId,
                communityId: existingRequest.communityId,
              },
            },
            update: {
              exitAt: null,
              role: ROLE.CLIENT,
            },
            create: {
              userId: existingRequest.fromId,
              communityId: existingRequest.communityId,
              role: ROLE.CLIENT,
            },
          });
        });
      } else {
        await prisma.request.update({
          where: { id: requestId },
          data: {
            status,
            acceptedById,
          },
        });
      }

      const updatedRequest = await prisma.request.findUnique({
        where: { id: requestId },
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
          community: {
            select: {
              id: true,
              name: true,
            },
          },
          acceptedBy: {
            select: {
              id: true,
              name: true,
              lastName: true,
            },
          },
        },
      });

      res.json(updatedRequest);
    } catch (error: any) {
      console.error('Error updating request:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Request not found' });
      }

      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'User is already a member of this community' });
      }

      next(error);
    }
  },
);

// DELETE /api/requests/:id - Delete/Cancel request
router.delete(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const requestId = parseInt(id, 10);

      if (isNaN(requestId)) {
        return res.status(400).json({ error: 'Invalid request ID' });
      }

      const existingRequest = await prisma.request.findUnique({
        where: { id: requestId },
      });

      if (!existingRequest) {
        return res.status(404).json({ error: 'Request not found' });
      }

      await ensureRequestAccess(req.user, {
        communityId: existingRequest.communityId,
        fromId: existingRequest.fromId,
      });

      const deleted = await prisma.request.delete({
        where: { id: requestId },
      });

      res.status(200).json({
        message: 'Solicitud eliminada exitosamente',
        id: deleted.id,
        fromId: deleted.fromId,
        communityId: deleted.communityId,
      });
    } catch (error: any) {
      console.error('Error deleting request:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Request not found' });
      }

      next(error);
    }
  },
);

export default router;
