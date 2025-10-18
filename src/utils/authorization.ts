import { ROLE } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { HTTP403Error, HTTP404Error } from './errors';
import { AuthUser } from '../middlewares/auth';

const ensureAuthenticated = (user?: AuthUser): AuthUser => {
  if (!user) {
    throw new HTTP403Error('Authentication required');
  }
  return user;
};

const isAdmin = (user: AuthUser) => user.role === ROLE.ADMIN;

export const ensureRole = (user: AuthUser | undefined, roles: ROLE[]): AuthUser => {
  const authUser = ensureAuthenticated(user);
  if (isAdmin(authUser)) {
    return authUser;
  }
  if (!roles.includes(authUser.role)) {
    throw new HTTP403Error('Access denied');
  }
  return authUser;
};

export const ensureSelfOrAdmin = (user: AuthUser | undefined, targetUserId: number): AuthUser => {
  const authUser = ensureAuthenticated(user);
  if (isAdmin(authUser) || authUser.userId === targetUserId) {
    return authUser;
  }
  throw new HTTP403Error('You are not allowed to manage this resource');
};

export const ensureCanManagePlace = async (user: AuthUser | undefined, placeId: number) => {
  const authUser = ensureAuthenticated(user);
  const place = await prisma.place.findUnique({
    where: { id: placeId },
    select: { id: true, ownerId: true },
  });

  if (!place) {
    throw new HTTP404Error('Place not found');
  }

  if (isAdmin(authUser) || place.ownerId === authUser.userId) {
    return place;
  }

  throw new HTTP403Error('You are not allowed to manage this place');
};

export const ensureCanManageEvent = async (user: AuthUser | undefined, eventId: number) => {
  const authUser = ensureAuthenticated(user);
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      organizerId: true,
      placeId: true,
      place: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!event) {
    throw new HTTP404Error('Event not found');
  }

  if (
    isAdmin(authUser) ||
    event.organizerId === authUser.userId ||
    event.place?.ownerId === authUser.userId
  ) {
    return event;
  }

  throw new HTTP403Error('You are not allowed to manage this event');
};

export const ensureCanManageProduct = async (user: AuthUser | undefined, productId: number) => {
  const authUser = ensureAuthenticated(user);
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      placeId: true,
      place: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!product) {
    throw new HTTP404Error('Product not found');
  }

  if (isAdmin(authUser) || product.place?.ownerId === authUser.userId) {
    return product;
  }

  throw new HTTP403Error('You are not allowed to manage this product');
};

export const ensureCanManageTicket = async (user: AuthUser | undefined, ticketId: number) => {
  const authUser = ensureAuthenticated(user);
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      event: {
        select: {
          organizerId: true,
          place: {
            select: {
              ownerId: true,
            },
          },
        },
      },
    },
  });

  if (!ticket) {
    throw new HTTP404Error('Ticket not found');
  }

  if (
    isAdmin(authUser) ||
    ticket.event?.organizerId === authUser.userId ||
    ticket.event?.place?.ownerId === authUser.userId
  ) {
    return ticket;
  }

  throw new HTTP403Error('You are not allowed to manage this ticket');
};

export const ensureCanManageAd = async (user: AuthUser | undefined, adId: number) => {
  const authUser = ensureAuthenticated(user);
  const ad = await prisma.ad.findUnique({
    where: { id: adId },
    select: {
      id: true,
      place: {
        select: {
          ownerId: true,
        },
      },
      event: {
        select: {
          organizerId: true,
          place: {
            select: {
              ownerId: true,
            },
          },
        },
      },
    },
  });

  if (!ad) {
    throw new HTTP404Error('Ad not found');
  }

  if (
    isAdmin(authUser) ||
    ad.place?.ownerId === authUser.userId ||
    ad.event?.organizerId === authUser.userId ||
    ad.event?.place?.ownerId === authUser.userId
  ) {
    return ad;
  }

  throw new HTTP403Error('You are not allowed to manage this ad');
};

export const ensureCanManagePromotion = async (
  user: AuthUser | undefined,
  promotionId: number,
) => {
  const authUser = ensureAuthenticated(user);
  const promotion = await prisma.promotion.findUnique({
    where: { id: promotionId },
    select: {
      id: true,
      type: true,
      product: {
        select: {
          id: true,
          place: {
            select: {
              ownerId: true,
            },
          },
        },
      },
      ticket: {
        select: {
          id: true,
          event: {
            select: {
              organizerId: true,
              place: {
                select: {
                  ownerId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!promotion) {
    throw new HTTP404Error('Promotion not found');
  }

  if (isAdmin(authUser)) {
    return promotion;
  }

  if (promotion.type === 'PRODUCT') {
    if (promotion.product?.place?.ownerId === authUser.userId) {
      return promotion;
    }
  } else if (
    promotion.ticket?.event?.organizerId === authUser.userId ||
    promotion.ticket?.event?.place?.ownerId === authUser.userId
  ) {
    return promotion;
  }

  throw new HTTP403Error('You are not allowed to manage this promotion');
};

export const ensureOwnsPurchase = async (user: AuthUser | undefined, purchaseId: number) => {
  const authUser = ensureAuthenticated(user);
  const purchase = await prisma.bought_Ticket.findUnique({
    where: { id: purchaseId },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!purchase) {
    throw new HTTP404Error('Purchased ticket not found');
  }

  if (isAdmin(authUser) || purchase.userId === authUser.userId) {
    return purchase;
  }

  throw new HTTP403Error('You are not allowed to manage this purchase');
};

export const ensureInvitationParticipant = async (
  user: AuthUser | undefined,
  invitationId: number,
) => {
  const authUser = ensureAuthenticated(user);
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      fromId: true,
      toId: true,
    },
  });

  if (!invitation) {
    throw new HTTP404Error('Invitation not found');
  }

  if (
    isAdmin(authUser) ||
    invitation.fromId === authUser.userId ||
    invitation.toId === authUser.userId
  ) {
    return invitation;
  }

  throw new HTTP403Error('You are not allowed to manage this invitation');
};

export const ensureIsMarket = (user: AuthUser | undefined) => ensureRole(user, [ROLE.MARKET]);

export const ensureIsAdmin = (user: AuthUser | undefined) => ensureRole(user, [ROLE.ADMIN]);
