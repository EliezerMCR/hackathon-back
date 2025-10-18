import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middlewares/auth';
import { HTTP403Error, HTTP404Error } from '../utils/errors';

const router = Router();
const prismaAny = prisma as any;

type AuthRequest = Request & { user?: { userId: number; role: string } };

const isGlobalAdmin = (req: AuthRequest) => req.user?.role === 'ADMIN';

const getCommunityWithRole = async (communityId: number, userId?: number) => {
  if (userId) {
    return prisma.community.findUnique({
      where: { id: communityId },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
      },
    }) as unknown as { id: number; name: string; createdById: number; members: { role: string }[] } | null;
  }

  return prisma.community.findUnique({ where: { id: communityId } }) as unknown as {
    id: number;
    name: string;
    createdById: number;
  } | null;
};

const ensureCommunityAdmin = async (req: AuthRequest, communityId: number) => {
  if (!req.user) {
    throw new HTTP403Error('Authentication required');
  }

  if (isGlobalAdmin(req)) {
    return;
  }

  const community = await getCommunityWithRole(communityId, req.user.userId);

  if (!community) {
    throw new HTTP404Error('Community not found');
  }

  const isCreator = community.createdById === req.user.userId;
  const role = (community as any)?.members?.[0]?.role;
  if (!isCreator && role !== 'ADMIN') {
    throw new HTTP403Error('You do not have permission to manage this community');
  }
};

// ==================== VALIDATION SCHEMAS ====================

const createCommunitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
});

const updateCommunitySchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

const communityEventFilterSchema = z.object({
  status: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  upcomingOnly: z
    .string()
    .optional()
    .transform(value => value === 'true'),
});

// ==================== COMMUNITIES CRUD ====================

// GET /api/communities - Get all communities
router.get('/', authenticate, async (req: Request, res: Response) => {
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
router.get('/:id', authenticate, async (req: Request, res: Response) => {
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
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = createCommunitySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { name } = validation.data;
    const creatorId = req.user?.userId;

    if (!creatorId) {
      throw new HTTP403Error('Authentication required');
    }

    const existing = await prisma.community.findFirst({
      where: { name },
    });
    if (existing) {
      return res.status(409).json({ error: 'Ya existe una comunidad con ese nombre' });
    }

    const community = await prisma.community.create({
      data: {
        name,
        createdById: creatorId,
        members: {
          create: {
            userId: creatorId,
            role: 'ADMIN',
          },
        },
      } as any,
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, lastName: true, email: true, image: true },
            },
          },
        },
      },
    });

    res.status(201).json({
      message: 'Comunidad creada exitosamente',
      community,
    });
  } catch (error) {
    console.error('Error creating community:', error);
    next(error);
  }
});

// GET /api/communities/:id/events - List events for a community
router.get('/:id/events', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const communityId = parseInt(id, 10);

    if (isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community ID' });
    }

    const filters = communityEventFilterSchema.safeParse(req.query);

    if (!filters.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: filters.error.errors,
      });
    }

    const { status, visibility, upcomingOnly } = filters.data;

    const where: any = {
      communityId,
    };

    if (status) {
      where.status = status;
    }

    if (visibility) {
      where.visibility = visibility;
    }

    if (upcomingOnly) {
      where.timeBegin = {
        gte: new Date(),
      };
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        place: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
            image: true,
          },
        },
        organizer: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
          },
        },
        _count: {
          select: {
            attendees: true,
            reviews: true,
          },
        },
      },
      orderBy: {
        timeBegin: 'asc',
      },
    });

    res.json(events);
  } catch (error) {
    console.error('Error fetching community events:', error);
    res.status(500).json({ error: 'Failed to fetch community events' });
  }
});

// PUT /api/communities/:id - Update community
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const communityId = parseInt(id, 10);

    if (isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community ID' });
    }

  await ensureCommunityAdmin(req, communityId);

  const inviterId = req.user!.userId;

    const validation = updateCommunitySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const community = await prisma.community.update({
      where: { id: communityId },
      data: validation.data,
    });

    res.json(community);
  } catch (error) {
    console.error('Error updating community:', error);
    next(error);
  }
});

// DELETE /api/communities/:id - Delete community
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const communityId = parseInt(id, 10);

    if (isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community ID' });
    }

    await ensureCommunityAdmin(req, communityId);

    const deleted = await prisma.community.delete({
      where: { id: communityId },
    });
    res.status(200).json({
      message: `Comunidad '${deleted.name}' eliminada exitosamente`,
      id: deleted.id,
    });
  } catch (error) {
    console.error('Error deleting community:', error);
    next(error);
  }
});

// ==================== COMMUNITY MEMBERS ====================

const addMemberSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(['CLIENT', 'MARKET', 'ADMIN']).default('CLIENT'),
});

// GET /api/communities/:id/members - Get community members
router.get('/:id/members', authenticate, async (req: Request, res: Response) => {
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
router.post('/:id/members', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const communityId = parseInt(id, 10);

    if (isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community ID' });
    }

    await ensureCommunityAdmin(req, communityId);

    const validation = addMemberSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { userId, role } = validation.data;

    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }

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

    next(error);
  }
});

// DELETE /api/communities/:id/members/:userId - Remove member from community
router.delete('/:id/members/:userId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id, userId } = req.params;
    const communityId = parseInt(id, 10);
    const memberUserId = parseInt(userId, 10);

    if (isNaN(communityId) || isNaN(memberUserId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    await ensureCommunityAdmin(req, communityId);

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

    next(error);
  }
});

// ==================== COMMUNITY INVITATIONS ====================

router.get('/:id/invitations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const communityId = parseInt(id, 10);

    if (isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community ID' });
    }

    await ensureCommunityAdmin(req, communityId);

  const invitations = await prismaAny.communityInvitation.findMany({
      where: { communityId },
      include: {
        invitedUser: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(invitations);
  } catch (error) {
    console.error('Error fetching community invitations:', error);
    next(error);
  }
});

router.post('/:id/invitations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const communityId = parseInt(id, 10);

    if (isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community ID' });
    }

    await ensureCommunityAdmin(req, communityId);

    const inviterId = req.user!.userId;

    const validation = inviteMemberSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { userId } = validation.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMember = await prisma.community_Member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
    });

    if (isMember) {
      return res.status(409).json({ error: 'User is already a member of this community' });
    }

    const existingInvitation = await prismaAny.communityInvitation.findUnique({
      where: {
        communityId_invitedUserId: {
          communityId,
          invitedUserId: userId,
        },
      },
    });

    if (existingInvitation && existingInvitation.status === 'PENDING') {
      return res.status(409).json({ error: 'User already has a pending invitation' });
    }

    const invitation = await prismaAny.communityInvitation.upsert({
      where: {
        communityId_invitedUserId: {
          communityId,
          invitedUserId: userId,
        },
      },
      update: {
        status: 'PENDING',
        invitedById: inviterId,
        respondedAt: null,
      },
      create: {
        communityId,
        invitedUserId: userId,
        invitedById: inviterId,
        status: 'PENDING',
      },
      include: {
        invitedUser: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
      },
    });

    res.status(201).json(invitation);
  } catch (error) {
    console.error('Error creating community invitation:', error);
    next(error);
  }
});

router.post('/invitations/:invitationId/accept', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { invitationId } = req.params;
    const id = parseInt(invitationId, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid invitation ID' });
    }

    const invitation = await prismaAny.communityInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.invitedUserId !== req.user?.userId) {
      throw new HTTP403Error('You are not allowed to respond to this invitation');
    }

    if (invitation.status !== 'PENDING') {
      return res.status(400).json({ error: 'Invitation already processed' });
    }

    await prisma.$transaction([
      prismaAny.communityInvitation.update({
        where: { id },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      }),
      prisma.community_Member.upsert({
        where: {
          userId_communityId: {
            userId: invitation.invitedUserId,
            communityId: invitation.communityId,
          },
        },
        update: {},
        create: {
          userId: invitation.invitedUserId,
          communityId: invitation.communityId,
          role: 'CLIENT',
        },
      }),
    ]);

    res.status(200).json({ message: 'Invitation accepted' });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    next(error);
  }
});

router.post('/invitations/:invitationId/reject', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { invitationId } = req.params;
    const id = parseInt(invitationId, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid invitation ID' });
    }

    const invitation = await prismaAny.communityInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.invitedUserId !== req.user?.userId) {
      throw new HTTP403Error('You are not allowed to respond to this invitation');
    }

    if (invitation.status !== 'PENDING') {
      return res.status(400).json({ error: 'Invitation already processed' });
    }

    await prismaAny.communityInvitation.update({
      where: { id },
      data: {
        status: 'REJECTED',
        respondedAt: new Date(),
      },
    });

    res.status(200).json({ message: 'Invitation rejected' });
  } catch (error) {
    console.error('Error rejecting invitation:', error);
    next(error);
  }
});

// ==================== COMMUNITY REQUESTS ====================


const inviteMemberSchema = z
  .object({
    userId: z.coerce.number().int().positive().optional(),
    invitedUserId: z.coerce.number().int().positive().optional(),
  })
  .refine(data => data.userId !== undefined || data.invitedUserId !== undefined, {
    message: 'userId is required',
    path: ['userId'],
  })
  .transform(data => ({ userId: data.userId ?? data.invitedUserId! }));

// GET /api/communities/:id/requests - Get community join requests
router.get('/:id/requests', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const communityId = parseInt(id, 10);

    if (isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community ID' });
    }

    await ensureCommunityAdmin(req, communityId);

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
    next(error);
  }
});

// POST /api/communities/:id/requests - Create join request
router.post('/:id/requests', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const communityId = parseInt(id, 10);

    if (isNaN(communityId)) {
      return res.status(400).json({ error: 'Invalid community ID' });
    }

    const userId = req.user?.userId;

    if (!userId) {
      throw new HTTP403Error('Authentication required');
    }

    const community = await prisma.community.findUnique({ where: { id: communityId } });
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    const isMember = await prisma.community_Member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
    });

    if (isMember) {
      return res.status(409).json({ error: 'User is already a member of this community' });
    }

    const existingRequest = await prisma.request.findUnique({
      where: {
        fromId_communityId: {
          fromId: userId,
          communityId,
        },
      },
    });

    if (existingRequest && existingRequest.status === 'PENDING') {
      return res.status(409).json({ error: 'You already have a pending request for this community' });
    }

    const request = await prisma.request.upsert({
      where: {
        fromId_communityId: {
          fromId: userId,
          communityId,
        },
      },
      update: {
        status: 'PENDING',
        acceptedById: null,
        type: 'JOIN',
      } as any,
      create: {
        fromId: userId,
        communityId,
        status: 'PENDING',
        type: 'JOIN',
      } as any,
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

    next(error);
  }
});

router.post('/:id/requests/:requestId/approve', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id, requestId } = req.params;
    const communityId = parseInt(id, 10);
    const reqId = parseInt(requestId, 10);

    if (isNaN(communityId) || isNaN(reqId)) {
      return res.status(400).json({ error: 'Invalid identifiers' });
    }

    await ensureCommunityAdmin(req, communityId);

    const joinRequest = await prisma.request.findFirst({
      where: { id: reqId, communityId },
    });

    if (!joinRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (joinRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    const userId = joinRequest.fromId;

    await prisma.$transaction([
      prisma.request.update({
        where: { id: joinRequest.id },
        data: {
          status: 'ACCEPTED',
          acceptedById: req.user?.userId ?? null,
        },
      }),
      prisma.community_Member.upsert({
        where: {
          userId_communityId: {
            userId,
            communityId,
          },
        },
        update: {},
        create: {
          userId,
          communityId,
          role: 'CLIENT',
        },
      }) as any,
    ]);

    res.status(200).json({ message: 'Request approved' });
  } catch (error) {
    console.error('Error approving request:', error);
    next(error);
  }
});

router.post('/:id/requests/:requestId/reject', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id, requestId } = req.params;
    const communityId = parseInt(id, 10);
    const reqId = parseInt(requestId, 10);

    if (isNaN(communityId) || isNaN(reqId)) {
      return res.status(400).json({ error: 'Invalid identifiers' });
    }

    await ensureCommunityAdmin(req, communityId);

    const joinRequest = await prisma.request.findFirst({
      where: { id: reqId, communityId },
    });

    if (!joinRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (joinRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    await prisma.request.update({
      where: { id: joinRequest.id },
      data: {
        status: 'REJECTED',
        acceptedById: req.user?.userId ?? null,
      },
    });

    res.status(200).json({ message: 'Request rejected' });
  } catch (error) {
    console.error('Error rejecting request:', error);
    next(error);
  }
});

router.get('/:communityId/is-member/:userId', authenticate, async (req: Request, res: Response) => {
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

export default router;
