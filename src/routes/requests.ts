import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const updateRequestSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
  acceptedById: z.number().int().positive().optional(),
});

// ==================== REQUESTS MANAGEMENT ====================

// GET /api/requests - Get all requests (optional: filter by user or status)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, status } = req.query;
    
    const where: any = {};
    
    if (userId) {
      const userIdNum = parseInt(userId as string, 10);
      if (!isNaN(userIdNum)) {
        where.fromId = userIdNum;
      }
    }
    
    if (status && ['PENDING', 'ACCEPTED', 'REJECTED'].includes(status as string)) {
      where.status = status;
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
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// GET /api/requests/:id - Get request by ID
router.get('/:id', async (req: Request, res: Response) => {
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

    res.json(request);
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// PATCH /api/requests/:id - Update request status (Accept/Reject)
router.patch('/:id', async (req: Request, res: Response) => {
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
        details: validation.error.errors 
      });
    }

    const { status, acceptedById } = validation.data;

    // Get the request to check current status
    const existingRequest = await prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!existingRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (existingRequest.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `Request already ${existingRequest.status.toLowerCase()}` 
      });
    }

    // If accepting, add user as community member
    if (status === 'ACCEPTED') {
      await prisma.$transaction(async (tx) => {
        // Update request status
        await tx.request.update({
          where: { id: requestId },
          data: {
            status,
            acceptedById,
          },
        });

        // Add user as community member
        await tx.community_Member.create({
          data: {
            userId: existingRequest.fromId,
            communityId: existingRequest.communityId,
            role: 'CLIENT', // Default role
          },
        });
      });
    } else {
      // Just update the request status to REJECTED
      await prisma.request.update({
        where: { id: requestId },
        data: {
          status,
          acceptedById,
        },
      });
    }

    // Fetch updated request with relations
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
    
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// DELETE /api/requests/:id - Delete/Cancel request
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestId = parseInt(id, 10);
    
    if (isNaN(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }
    
    const deleted = await prisma.request.delete({
      where: { id: requestId },
    });
    res.status(200).json({
  message: `Solicitud eliminada exitosamente`,
  id: deleted.id,
  fromId: deleted.fromId,
  communityId: deleted.communityId,
    });
  } catch (error: any) {
    console.error('Error deleting request:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

export default router;
