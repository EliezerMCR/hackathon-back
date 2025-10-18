import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const createCommunitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
});

const updateCommunitySchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

// ==================== COMMUNITIES CRUD ====================

// GET /api/communities - Get all communities
router.get('/', async (req: Request, res: Response) => {
  try {
    const communities = await prisma.community.findMany({
      include: {
        _count: {
          select: {
            members: true,
            events: true,
            requests: true,
          },
        },
      },
    });
    
    res.json(communities);
  } catch (error) {
    console.error('Error fetching communities:', error);
    res.status(500).json({ error: 'Failed to fetch communities' });
  }
});

// GET /api/communities/:id - Get community by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const communityId = parseInt(id, 10);
    
    if (isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community ID' });
    }

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
                image: true,
              },
            },
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
            place: {
              select: {
                name: true,
                city: true,
                country: true,
              },
            },
          },
        },
        _count: {
          select: {
            requests: true,
          },
        },
      },
    });

    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    res.json(community);
  } catch (error) {
    console.error('Error fetching community:', error);
    res.status(500).json({ error: 'Failed to fetch community' });
  }
});

// POST /api/communities - Create new community
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = createCommunitySchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validation.error.errors 
      });
    }

    const { name } = validation.data;
      // Verificar si ya existe una comunidad con el mismo nombre
      const existing = await prisma.community.findFirst({
        where: { name },
      });
      if (existing) {
        return res.status(409).json({ error: 'Ya existe una comunidad con ese nombre' });
      }
      const community = await prisma.community.create({
        data: { name },
      });
      res.status(201).json({
        message: 'Comunidad creada exitosamente',
        community,
      });
  } catch (error) {
    console.error('Error creating community:', error);
    res.status(500).json({ error: 'Failed to create community' });
  }
});

// PUT /api/communities/:id - Update community
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const communityId = parseInt(id, 10);
    
    if (isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community ID' });
    }

    const validation = updateCommunitySchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validation.error.errors 
      });
    }

    const community = await prisma.community.update({
      where: { id: communityId },
      data: validation.data,
    });

    res.json(community);
  } catch (error: any) {
    console.error('Error updating community:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Community not found' });
    }
    
    res.status(500).json({ error: 'Failed to update community' });
  }
});

// DELETE /api/communities/:id - Delete community
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const communityId = parseInt(id, 10);
    
    if (isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community ID' });
    }
    
    const deleted = await prisma.community.delete({
      where: { id: communityId },
    });
    res.status(200).json({
      message: `Comunidad '${deleted.name}' eliminada exitosamente`,
      id: deleted.id,
    });
  } catch (error: any) {
    console.error('Error deleting community:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Community not found' });
    }
    
    res.status(500).json({ error: 'Failed to delete community' });
  }
});

// ==================== COMMUNITY MEMBERS ====================

const addMemberSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(['CLIENT', 'MARKET', 'ADMIN']).default('CLIENT'),
});

// GET /api/communities/:id/members - Get community members
router.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const communityId = parseInt(id, 10);
    
    if (isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community ID' });
    }

    const members = await prisma.community_Member.findMany({
      where: { communityId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
            membership: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(members);
  } catch (error) {
    console.error('Error fetching community members:', error);
    res.status(500).json({ error: 'Failed to fetch community members' });
  }
});

// POST /api/communities/:id/members - Add member to community (Admin only)
router.post('/:id/members', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const communityId = parseInt(id, 10);
    
    if (isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community ID' });
    }

    const validation = addMemberSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validation.error.errors 
      });
    }

    const { userId, role } = validation.data;

    // Verify community exists
    const communityExists = await prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!communityExists) {
      return res.status(404).json({ error: 'Community not found' });
    }

    // Verify user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add member
    const member = await prisma.community_Member.create({
      data: {
        userId,
        communityId,
        role,
      },
      include: {
        user: {
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
      },
    });

    res.status(201).json(member);
  } catch (error: any) {
    console.error('Error adding community member:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'User is already a member of this community' });
    }
    
    res.status(500).json({ error: 'Failed to add community member' });
  }
});

// DELETE /api/communities/:id/members/:userId - Remove member from community
router.delete('/:id/members/:userId', async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;
    const communityId = parseInt(id, 10);
    const memberUserId = parseInt(userId, 10);
    
    if (isNaN(communityId) || isNaN(memberUserId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const deleted = await prisma.community_Member.delete({
      where: {
        userId_communityId: {
          userId: memberUserId,
          communityId,
        },
      },
    });
    res.status(200).json({
      message: `Miembro eliminado exitosamente de la comunidad`,
      userId: deleted.userId,
      communityId: deleted.communityId,
    });
  } catch (error: any) {
    console.error('Error removing community member:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Member not found in this community' });
    }
    
    res.status(500).json({ error: 'Failed to remove community member' });
  }
});

// ==================== COMMUNITY REQUESTS ====================

const createRequestSchema = z.object({
  fromId: z.number().int().positive(),
});

// GET /api/communities/:id/requests - Get community join requests
router.get('/:id/requests', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const communityId = parseInt(id, 10);
    
    if (isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community ID' });
    }

    const requests = await prisma.request.findMany({
      where: { communityId },
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
    console.error('Error fetching community requests:', error);
    res.status(500).json({ error: 'Failed to fetch community requests' });
  }
});

// POST /api/communities/:id/requests - Create join request
router.post('/:id/requests', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const communityId = parseInt(id, 10);
    
    if (isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community ID' });
    }

    const validation = createRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validation.error.errors 
      });
    }

    const { fromId } = validation.data;

    // Verify community exists
    const communityExists = await prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!communityExists) {
      return res.status(404).json({ error: 'Community not found' });
    }

    // Verify user exists
    const userExists = await prisma.user.findUnique({
      where: { id: fromId },
    });

    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already a member
    const isMember = await prisma.community_Member.findUnique({
      where: {
        userId_communityId: {
          userId: fromId,
          communityId,
        },
      },
    });

    if (isMember) {
      return res.status(409).json({ error: 'User is already a member of this community' });
    }

    // Create request
    const request = await prisma.request.create({
      data: {
        fromId,
        communityId,
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
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(request);
  } catch (error: any) {
    console.error('Error creating request:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Request already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create request' });
  }
});

router.get('/:communityId/is-member/:userId', async (req: Request, res: Response) => {
  try {
    const communityId = parseInt(req.params.communityId, 10);
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(communityId) || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid communityId or userId' });
    }

    const member = await prisma.community_Member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
    });

    res.json({ isMember: !!member });
  } catch (error) {
    console.error('Error checking membership:', error);
    res.status(500).json({ error: 'Failed to check membership' });
  }
});

router.get('/member/:userId', async (req: Request, res: Response, next) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    const memberships = await prisma.community_Member.findMany({
      where: { userId },
      include: {
        community: true,
      },
    });

    const communities = memberships.map(m => ({
      id: m.community.id,
      name: m.community.name,
      role: m.role,
      joinedAt: m.createdAt,
    }));

    res.json({ communities });
  } catch (error) {
    next(error);
  }
});

export default router;
