import { ROLE } from '@prisma/client';

import { CommunityMemberSeed } from './types';

export const communityMembers: CommunityMemberSeed[] = [
  {
    communityKey: 'community-innovadores',
    userKey: 'admin-juan',
    role: ROLE.ADMIN,
  },
  {
    communityKey: 'community-innovadores',
    userKey: 'client-daniela',
    role: ROLE.CLIENT,
  },
  {
    communityKey: 'community-innovadores',
    userKey: 'client-gabriel',
    role: ROLE.CLIENT,
  },
  {
    communityKey: 'community-foodies',
    userKey: 'market-sofia',
    role: ROLE.ADMIN,
  },
  {
    communityKey: 'community-foodies',
    userKey: 'client-luisa',
    role: ROLE.CLIENT,
  },
  {
    communityKey: 'community-foodies',
    userKey: 'client-elisabeth',
    role: ROLE.CLIENT,
  },
  {
    communityKey: 'community-nightowls',
    userKey: 'market-alejandro',
    role: ROLE.ADMIN,
  },
  {
    communityKey: 'community-nightowls',
    userKey: 'client-sergio',
    role: ROLE.CLIENT,
  },
  {
    communityKey: 'community-nightowls',
    userKey: 'client-ricardo',
    role: ROLE.CLIENT,
  },
  {
    communityKey: 'community-waraira',
    userKey: 'client-gabriel',
    role: ROLE.ADMIN,
  },
  {
    communityKey: 'community-waraira',
    userKey: 'client-natalia',
    role: ROLE.CLIENT,
  },
  {
    communityKey: 'community-waraira',
    userKey: 'client-daniela',
    role: ROLE.CLIENT,
  },
  {
    communityKey: 'community-runners-altamira',
    userKey: 'client-sergio',
    role: ROLE.ADMIN,
  },
  {
    communityKey: 'community-runners-altamira',
    userKey: 'client-gabriel-cuevas',
    role: ROLE.CLIENT,
  },
  {
    communityKey: 'community-runners-altamira',
    userKey: 'client-eliezer-cario',
    role: ROLE.CLIENT,
  },
  {
    communityKey: 'community-padel-mercedes',
    userKey: 'client-ricardo',
    role: ROLE.ADMIN,
  },
  {
    communityKey: 'community-padel-mercedes',
    userKey: 'client-jhonaiker-blanco',
    role: ROLE.CLIENT,
  },
  {
    communityKey: 'community-tenis-avila',
    userKey: 'client-daniela',
    role: ROLE.ADMIN,
  },
  {
    communityKey: 'community-tenis-avila',
    userKey: 'client-miguel-salomon',
    role: ROLE.CLIENT,
  },
  {
    communityKey: 'community-senderistas',
    userKey: 'client-luisa',
    role: ROLE.ADMIN,
  },
  {
    communityKey: 'community-senderistas',
    userKey: 'client-gabriel',
    role: ROLE.CLIENT,
  },
  {
    communityKey: 'community-jazz-lounge',
    userKey: 'client-juan-andres-cuevas',
    role: ROLE.ADMIN,
  },
  {
    communityKey: 'community-jazz-lounge',
    userKey: 'client-elisabeth',
    role: ROLE.CLIENT,
  },
  {
    communityKey: 'community-house-underground',
    userKey: 'market-alejandro',
    role: ROLE.ADMIN,
  },
  {
    communityKey: 'community-house-underground',
    userKey: 'client-eliezer-cario',
    role: ROLE.CLIENT,
  },
  {
    communityKey: 'community-musica-llanera',
    userKey: 'client-mikele-salomon',
    role: ROLE.ADMIN,
  },
  {
    communityKey: 'community-musica-llanera',
    userKey: 'client-miguel-salomon',
    role: ROLE.CLIENT,
  },
  {
    communityKey: 'community-cine-forum',
    userKey: 'client-elisabeth',
    role: ROLE.ADMIN,
  },
  {
    communityKey: 'community-cine-forum',
    userKey: 'client-gabriel-cuevas',
    role: ROLE.CLIENT,
  },
];
