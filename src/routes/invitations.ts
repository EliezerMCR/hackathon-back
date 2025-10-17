import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../app';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const createInvitationSchema = z.object({
  fromId: z.number().int().positive(),
  toId: z.number().int().positive(),
  placeId: z.number().int().positive(),
  eventId: z.number().int().positive().optional(),
  invitationDate: z.string().optional(),
});

const updateInvitationStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
});

// ==================== INVITATIONS ====================

// GET /api/invitations - Get all invitations (with filters)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { fromId, toId, status } = req.query;
    
    const where: any = {};
    
    if (fromId) {
      const fromIdNum = parseInt(fromId as string, 10);
      if (!isNaN(fromIdNum)) {
        where.fromId = fromIdNum;
      }
    }
    
    if (toId) {
      const toIdNum = parseInt(toId as string, 10);
      if (!isNaN(toIdNum)) {
        where.toId = toIdNum;
      }
    }
    
    if (status && ['PENDING', 'ACCEPTED', 'REJECTED'].includes(status as string)) {
      where.status = status;
    }

    const invitations = await prisma.invitation.findMany({
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
        to: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
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
        createdAt: 'desc',
      },
    });

    res.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// GET /api/invitations/:id - Get invitation by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invitationId = parseInt(id, 10);
    
    if (isNaN(invitationId)) {
      return res.status(400).json({ error: 'Invalid invitation ID' });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
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
        to: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        place: {
          select: {
            id: true,
            name: true,
            direction: true,
            city: true,
            country: true,
            type: true,
            mapUrl: true,
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
            minAge: true,
          },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    res.json(invitation);
  } catch (error) {
    console.error('Error fetching invitation:', error);
    res.status(500).json({ error: 'Failed to fetch invitation' });
  }
});

// POST /api/invitations - Create new invitation
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = createInvitationSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validation.error.errors 
      });
    }

    const { fromId, toId, placeId, eventId, invitationDate } = validation.data;

    // Verify users exist
    const [fromUser, toUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: fromId } }),
      prisma.user.findUnique({ where: { id: toId } }),
    ]);

    if (!fromUser) {
      return res.status(404).json({ error: 'Sender user not found' });
    }

    if (!toUser) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }

    // Verify place exists
    const placeExists = await prisma.place.findUnique({
      where: { id: placeId },
    });

    if (!placeExists) {
      return res.status(404).json({ error: 'Place not found' });
    }

    // Verify event exists if provided
    if (eventId) {
      const eventExists = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!eventExists) {
        return res.status(404).json({ error: 'Event not found' });
      }
    }

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        fromId,
        toId,
        placeId,
        eventId,
        invitationDate: invitationDate ? new Date(invitationDate) : null,
        status: 'PENDING',
      },
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
        to: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        place: {
          select: {
            id: true,
            name: true,
            direction: true,
            city: true,
            country: true,
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
    });

    res.status(201).json(invitation);
  } catch (error: any) {
    console.error('Error creating invitation:', error);
    
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

// PATCH /api/invitations/:id/status - Update invitation status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invitationId = parseInt(id, 10);
    
    if (isNaN(invitationId)) {
      return res.status(400).json({ error: 'Invalid invitation ID' });
    }

    const validation = updateInvitationStatusSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validation.error.errors 
      });
    }

    const { status } = validation.data;

    // Get the invitation to check current status
    const existingInvitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!existingInvitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (existingInvitation.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `Invitation already ${existingInvitation.status.toLowerCase()}` 
      });
    }

    // Update invitation status
    const invitation = await prisma.invitation.update({
      where: { id: invitationId },
      data: { status },
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
        to: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        place: {
          select: {
            id: true,
            name: true,
            direction: true,
            city: true,
            country: true,
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
    });

    res.json(invitation);
  } catch (error: any) {
    console.error('Error updating invitation status:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    
    res.status(500).json({ error: 'Failed to update invitation status' });
  }
});

// DELETE /api/invitations/:id - Delete/Cancel invitation
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invitationId = parseInt(id, 10);
    
    if (isNaN(invitationId)) {
      return res.status(400).json({ error: 'Invalid invitation ID' });
    }
    
    const deleted = await prisma.invitation.delete({
      where: { id: invitationId },
    });
    res.status(200).json({
  message: `Invitación eliminada exitosamente`,
  id: deleted.id,
  fromId: deleted.fromId,
  toId: deleted.toId,
    });
  } catch (error: any) {
    console.error('Error deleting invitation:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    
    res.status(500).json({ error: 'Failed to delete invitation' });
  }
});

export default router;
