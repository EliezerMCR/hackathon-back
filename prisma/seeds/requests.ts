import { RequestType, Status } from '@prisma/client';

import { RequestSeed } from './types';

export const requests: RequestSeed[] = [
  {
    fromKey: 'client-luisa',
    communityKey: 'community-innovadores',
    status: Status.ACCEPTED,
    type: RequestType.JOIN,
    acceptedByKey: 'admin-juan',
  },
  {
    fromKey: 'client-ricardo',
    communityKey: 'community-nightowls',
    status: Status.ACCEPTED,
    type: RequestType.JOIN,
    acceptedByKey: 'market-alejandro',
  },
  {
    fromKey: 'client-natalia',
    communityKey: 'community-foodies',
    status: Status.PENDING,
    type: RequestType.JOIN,
  },
  {
    fromKey: 'client-sergio',
    communityKey: 'community-waraira',
    status: Status.REJECTED,
    type: RequestType.JOIN,
    acceptedByKey: 'client-gabriel',
  },
  {
    fromKey: 'market-sofia',
    communityKey: 'community-innovadores',
    status: Status.ACCEPTED,
    type: RequestType.INVITE,
    acceptedByKey: 'admin-juan',
  },
];