import { Status } from '@prisma/client';

import { InvitationSeed } from './types';

export const invitations: InvitationSeed[] = [
  {
    fromKey: 'admin-juan',
    toKey: 'client-luisa',
    placeKey: 'place-altamira-hub',
    eventKey: 'event-dev-meetup',
    status: Status.ACCEPTED,
    invitationDate: new Date('2025-01-28T09:00:00-04:00'),
  },
  {
    fromKey: 'market-sofia',
    toKey: 'client-elisabeth',
    placeKey: 'place-mercado-mercedes',
    eventKey: 'event-ruta-gastronomica',
    status: Status.ACCEPTED,
    invitationDate: new Date('2025-02-20T15:00:00-04:00'),
  },
  {
    fromKey: 'market-alejandro',
    toKey: 'client-ricardo',
    placeKey: 'place-nocturna-360',
    eventKey: 'event-rooftop-electronica',
    status: Status.PENDING,
    invitationDate: new Date('2025-02-05T20:00:00-04:00'),
  },
  {
    fromKey: 'client-gabriel',
    toKey: 'client-natalia',
    placeKey: 'place-waraira-fit',
    eventKey: 'event-waraira-sunrise',
    status: Status.ACCEPTED,
    invitationDate: new Date('2025-01-15T18:30:00-04:00'),
  },
  {
    fromKey: 'admin-juan',
    toKey: 'client-ricardo',
    placeKey: 'place-teresa-carreno',
    eventKey: 'event-teresa-sinf',
    status: Status.PENDING,
    invitationDate: new Date('2025-02-25T13:45:00-04:00'),
  },
  {
    fromKey: 'market-sofia',
    toKey: 'client-daniela',
    placeKey: 'place-santa-rosalia-lab',
    eventKey: 'event-podcast-makers',
    status: Status.ACCEPTED,
    invitationDate: new Date('2025-02-27T11:00:00-04:00'),
  },
];
