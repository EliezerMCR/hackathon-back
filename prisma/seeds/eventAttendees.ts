import { EventAttendeeSeed } from './types';

export const eventAttendees: EventAttendeeSeed[] = [
  {
    eventKey: 'event-dev-meetup',
    userKey: 'client-daniela',
    joinedAt: new Date('2025-02-01T09:00:00-04:00'),
  },
  {
    eventKey: 'event-dev-meetup',
    userKey: 'client-gabriel',
    joinedAt: new Date('2025-02-01T09:05:00-04:00'),
  },
  {
    eventKey: 'event-ruta-gastronomica',
    userKey: 'client-elisabeth',
  },
  {
    eventKey: 'event-rooftop-electronica',
    userKey: 'client-sergio',
  },
  {
    eventKey: 'event-waraira-sunrise',
    userKey: 'client-natalia',
    joinedAt: new Date('2025-01-22T11:00:00-04:00'),
  },
  {
    eventKey: 'event-podcast-makers',
    userKey: 'client-luisa',
  },
];
