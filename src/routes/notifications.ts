import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Validation schemas
const createNotificationSchema = z.object({
  userId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
});

const updateNotificationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  message: z.string().min(1).optional(),
  read: z.boolean().optional(),
});

/**
 * GET /api/notifications
 * Get all notifications (Admin only) or user's own notifications
 */
router.get('/', authenticate, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const { read, userId: filterUserId } = req.query;

    let where: any = {};

    // If not admin, only show own notifications
    if (role !== 'ADMIN') {
      where.userId = userId;
    } else if (filterUserId) {
      // Admin can filter by userId
      where.userId = parseInt(filterUserId as string);
    }

    // Filter by read status
    if (read !== undefined) {
      where.read = read === 'true';
    }

    const notifications = await prisma.notification.findMany({
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error al obtener las notificaciones' });
  }
});

/**
 * PUT /api/notifications/mark-all-read
 * Mark all user's notifications as read
 */
router.put('/mark-all-read', authenticate, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({ 
      message: `${result.count} notificaciones marcadas como leídas`,
      count: result.count,
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Error al marcar las notificaciones como leídas' });
  }
});

/**
 * GET /api/notifications/:id
 * Get a notification by ID
 */
router.get('/:id', authenticate, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    // Users can only see their own notifications, admins can see all
    if (role !== 'ADMIN' && notification.userId !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para ver esta notificación' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({ message: 'Error al obtener la notificación' });
  }
});

/**
 * POST /api/notifications
 * Create a new notification (Admin only)
 */
router.post('/', authenticate, authorize(['ADMIN']), async (req: any, res: Response) => {
  try {
    const validatedData = createNotificationSchema.parse(req.body);

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const notification = await prisma.notification.create({
      data: validatedData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(notification);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.errors });
    }
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Error al crear la notificación' });
  }
});

/**
 * PUT /api/notifications/:id
 * Update a notification (User can mark as read, Admin can edit all fields)
 */
router.put('/:id', authenticate, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(id) },
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    // Users can only update their own notifications, admins can update all
    if (role !== 'ADMIN' && notification.userId !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para actualizar esta notificación' });
    }

    const validatedData = updateNotificationSchema.parse(req.body);

    // If not admin, users can only update the 'read' field
    let dataToUpdate = validatedData;
    if (role !== 'ADMIN') {
      dataToUpdate = { read: validatedData.read };
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.json(updatedNotification);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.errors });
    }
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Error al actualizar la notificación' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification (Admin only or own notification)
 */
router.delete('/:id', authenticate, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(id) },
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    // Users can only delete their own notifications, admins can delete all
    if (role !== 'ADMIN' && notification.userId !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar esta notificación' });
    }

    await prisma.notification.delete({
      where: { id: parseInt(id) },
    });

    res.json({ 
      message: 'Notificación eliminada exitosamente',
      notification: {
        id: notification.id,
        title: notification.title,
      },
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error al eliminar la notificación' });
  }
});

export default router;
