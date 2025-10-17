import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../app';

const router = Router();

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email().max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(255),
  birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  gender: z.enum(['MAN', 'WOMAN']),
  role: z.enum(['CLIENT', 'MARKET', 'ADMIN']),
  membership: z.enum(['NORMAL', 'VIP']).default('NORMAL'),
  documentId: z.number().int(),
  image: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  password: z.string().min(6).max(255).optional(),
  birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  gender: z.enum(['MAN', 'WOMAN']).optional(),
  membership: z.enum(['NORMAL', 'VIP']).optional(),
  image: z.string().optional(),
});

// GET /api/users - Get all users
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        birthDate: true,
        city: true,
        country: true,
        gender: true,
        role: true,
        membership: true,
        image: true,
        createdAt: true,
      },
    });
    return res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        birthDate: true,
        city: true,
        country: true,
        gender: true,
        role: true,
        membership: true,
        image: true,
        createdAt: true,
        organizedEvents: {
          select: {
            id: true,
            name: true,
            description: true,
            timeBegin: true,
            timeEnd: true,
            status: true,
          },
        },
        boughtTickets: {
          select: {
            id: true,
            price: true,
            createdAt: true,
            ticket: {
              select: {
                type: true,
                description: true,
                event: {
                  select: {
                    name: true,
                    timeBegin: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users - Create new user
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = createUserSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validation.error.errors 
      });
    }

    const { email, name, lastName, password, birthDate, city, country, gender, role, membership, documentId, image } = validation.data;

    const user = await prisma.user.create({
      data: {
        email,
        name,
        lastName,
        password, // Remember to hash this in production!
        birthDate: new Date(birthDate),
        city,
        country,
        gender,
        role,
        membership: membership || 'NORMAL',
        documentId,
        image,
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        birthDate: true,
        city: true,
        country: true,
        gender: true,
        role: true,
        membership: true,
        image: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const validation = updateUserSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validation.error.errors 
      });
    }

    const updateData: any = { ...validation.data };
    if (updateData.birthDate) {
      updateData.birthDate = new Date(updateData.birthDate);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        birthDate: true,
        city: true,
        country: true,
        gender: true,
        role: true,
        membership: true,
        image: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error: any) {
    console.error('Error updating user:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    await prisma.user.delete({
      where: { id: userId },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting user:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;