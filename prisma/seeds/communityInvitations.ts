import { Status } from '@prisma/client';

import { CommunityInvitationSeed } from './types';

export const communityInvitations: CommunityInvitationSeed[] = [
  {
    communityKey: 'community-innovadores',
    invitedUserKey: 'client-elisabeth',
    invitedByKey: 'admin-juan',
    status: Status.PENDING,
  },
  {
    communityKey: 'community-foodies',
    invitedUserKey: 'client-sergio',
    invitedByKey: 'market-sofia',
    status: Status.REJECTED,
    respondedAt: new Date('2025-02-12T12:10:00-04:00'),
  },
  {
    communityKey: 'community-waraira',
    invitedUserKey: 'client-ricardo',
    invitedByKey: 'client-gabriel',
    status: Status.ACCEPTED,
    respondedAt: new Date('2025-01-30T07:45:00-04:00'),
  },
];
