import { EventVisibility, Gender, Membership, PromotionType, RequestType, ROLE, Status } from '@prisma/client';

export type UserSeed = {
  key: string;
  name: string;
  lastName: string;
  email: string;
  password: string;
  birthDate: Date;
  city: string;
  country: string;
  gender: Gender;
  role: ROLE;
  membership: Membership;
  documentId: number;
  image?: string;
};

export type CategorySeed = {
  key: string;
  name: string;
  description: string;
  createdByKey: string;
};

export type PlaceSeed = {
  key: string;
  ownerKey: string;
  name: string;
  direction: string;
  city: string;
  country: string;
  capacity: number;
  type: string;
  status: Status;
  image?: string;
  description?: string;
  mapUrl?: string;
  igUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
};

export type ProductSeed = {
  key: string;
  name: string;
  price: number;
  image: string;
  placeKey: string;
};

export type CommunitySeed = {
  key: string;
  name: string;
  description: string;
  image?: string;
  createdByKey: string;
  categoryKey: string;
};

export type CommunityMemberSeed = {
  communityKey: string;
  userKey: string;
  role: ROLE;
};

export type EventSeed = {
  key: string;
  name: string;
  description: string;
  timeBegin: Date;
  timeEnd: Date;
  placeKey: string;
  organizerKey: string;
  communityKey?: string;
  categoryKey: string;
  minAge: number;
  status: string;
  visibility: EventVisibility;
  externalUrl?: string;
  image?: string;
};

export type TicketSeed = {
  key: string;
  eventKey: string;
  type: string;
  price: number;
  quantity: number;
  description: string;
};

export type PromotionProductSeed = {
  type: 'PRODUCT';
  productKey: string;
  membership: Membership;
  discount: number;
  timeBegin: Date;
  timeEnd?: Date;
};

export type PromotionTicketSeed = {
  type: 'TICKET';
  ticketKey: string;
  membership: Membership;
  discount: number;
  timeBegin: Date;
  timeEnd?: Date;
};

export type PromotionSeed = PromotionProductSeed | PromotionTicketSeed;

export type BoughtTicketSeed = {
  ticketKey: string;
  userKey: string;
};

export type EventAttendeeSeed = {
  eventKey: string;
  userKey: string;
  joinedAt?: Date;
};

export type ReviewSeed = {
  userKey: string;
  placeKey: string;
  eventKey?: string;
  calification: number;
  comment: string;
};

export type RequestSeed = {
  fromKey: string;
  communityKey: string;
  status: Status;
  type: RequestType;
  acceptedByKey?: string;
};

export type InvitationSeed = {
  fromKey: string;
  toKey: string;
  placeKey: string;
  eventKey?: string;
  status: Status;
  invitationDate: Date;
};

export type CommunityInvitationSeed = {
  communityKey: string;
  invitedUserKey: string;
  invitedByKey: string;
  status: Status;
  respondedAt?: Date;
};

export type NotificationSeed = {
  userKey: string;
  title: string;
  message: string;
  read?: boolean;
};

export type ReportSeed = {
  fromKey: string;
  toKey: string;
  description: string;
};

export type AdSeed = {
  placeKey: string;
  eventKey?: string;
  timeBegin: Date;
  timeEnd: Date;
};
