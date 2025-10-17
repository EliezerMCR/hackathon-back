import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../app';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const buyTicketSchema = z.object({
  userId: z.number().int().positive(),
  ticketId: z.number().int().positive(),
  quantity: z.number().int().positive().min(1).default(1),
});

// ==================== TICKETS (COMPRA) ====================

// GET /api/tickets/bought - Get all bought tickets (with filters)
router.get('/bought', async (req: Request, res: Response) => {
  try {
    const { userId, eventId } = req.query;
    
    const where: any = {};
    
    if (userId) {
      const userIdNum = parseInt(userId as string, 10);
      if (!isNaN(userIdNum)) {
        where.userId = userIdNum;
      }
    }
    
    if (eventId) {
      const eventIdNum = parseInt(eventId as string, 10);
      if (!isNaN(eventIdNum)) {
        where.ticket = {
          eventId: eventIdNum,
        };
      }
    }

    const boughtTickets = await prisma.bought_Ticket.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        ticket: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                description: true,
                timeBegin: true,
                timeEnd: true,
                status: true,
                place: {
                  select: {
                    name: true,
                    city: true,
                    country: true,
                    direction: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(boughtTickets);
  } catch (error) {
    console.error('Error fetching bought tickets:', error);
    res.status(500).json({ error: 'Failed to fetch bought tickets' });
  }
});

// GET /api/tickets/bought/:id - Get bought ticket by ID
router.get('/bought/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const boughtTicketId = parseInt(id, 10);
    
    if (isNaN(boughtTicketId)) {
      return res.status(400).json({ error: 'Invalid bought ticket ID' });
    }

    const boughtTicket = await prisma.bought_Ticket.findUnique({
      where: { id: boughtTicketId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            membership: true,
          },
        },
        ticket: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                description: true,
                timeBegin: true,
                timeEnd: true,
                status: true,
                minAge: true,
                place: {
                  select: {
                    name: true,
                    city: true,
                    country: true,
                    direction: true,
                    mapUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!boughtTicket) {
      return res.status(404).json({ error: 'Bought ticket not found' });
    }

    res.json(boughtTicket);
  } catch (error) {
    console.error('Error fetching bought ticket:', error);
    res.status(500).json({ error: 'Failed to fetch bought ticket' });
  }
});

// POST /api/tickets/buy - Buy ticket(s)
router.post('/buy', async (req: Request, res: Response) => {
  try {
    const validation = buyTicketSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validation.error.errors 
      });
    }

    const { userId, ticketId, quantity } = validation.data;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify ticket exists and get current quantity
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: {
          select: {
            name: true,
            timeBegin: true,
            status: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check if event is still open
    if (ticket.event.status === 'finalizado' || ticket.event.status === 'cancelado') {
      return res.status(400).json({ 
        error: `Cannot buy tickets for ${ticket.event.status} event` 
      });
    }

    // Check ticket availability
    if (ticket.quantity < quantity) {
      return res.status(400).json({ 
        error: `Not enough tickets available. Only ${ticket.quantity} left.` 
      });
    }

    // Create transaction to buy tickets and update quantity
    const boughtTickets = await prisma.$transaction(async (tx) => {
      // Reduce ticket quantity
      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          quantity: {
            decrement: quantity,
          },
        },
      });

      // Create bought ticket records
      const purchases = [];
      for (let i = 0; i < quantity; i++) {
        const purchase = await tx.bought_Ticket.create({
          data: {
            userId,
            ticketId,
            price: ticket.price,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
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
        });
        purchases.push(purchase);
      }

      return purchases;
    });

    res.status(201).json({
      message: `Successfully purchased ${quantity} ticket(s)`,
      tickets: boughtTickets,
      total: ticket.price.toNumber() * quantity,
    });
  } catch (error: any) {
    console.error('Error buying ticket:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.status(500).json({ error: 'Failed to buy ticket' });
  }
});

// DELETE /api/tickets/bought/:id - Cancel/Refund bought ticket
router.delete('/bought/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const boughtTicketId = parseInt(id, 10);
    
    if (isNaN(boughtTicketId)) {
      return res.status(400).json({ error: 'Invalid bought ticket ID' });
    }

    // Get bought ticket to restore quantity
    const boughtTicket = await prisma.bought_Ticket.findUnique({
      where: { id: boughtTicketId },
      include: {
        ticket: {
          include: {
            event: {
              select: {
                timeBegin: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!boughtTicket) {
      return res.status(404).json({ error: 'Bought ticket not found' });
    }

    // Check if event hasn't started yet (allow refund only before event)
    const eventDate = new Date(boughtTicket.ticket.event.timeBegin);
    const now = new Date();
    
    if (eventDate < now) {
      return res.status(400).json({ 
        error: 'Cannot refund ticket for past or ongoing event' 
      });
    }

    // Delete bought ticket and restore quantity in transaction
    await prisma.$transaction([
      prisma.bought_Ticket.delete({
        where: { id: boughtTicketId },
      }),
      prisma.ticket.update({
        where: { id: boughtTicket.ticketId },
        data: {
          quantity: {
            increment: 1,
          },
        },
      }),
    ]);

    res.status(200).json({
      message: `Ticket reembolsado/eliminado exitosamente`,
      id: boughtTicket.id,
      userId: boughtTicket.userId,
      ticketId: boughtTicket.ticketId,
    });
  } catch (error: any) {
    console.error('Error refunding ticket:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Bought ticket not found' });
    }
    
    res.status(500).json({ error: 'Failed to refund ticket' });
  }
});

export default router;
