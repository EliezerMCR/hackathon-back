import { AdSeed } from './types';

export const ads: AdSeed[] = [
  {
    placeKey: 'place-altamira-hub',
    eventKey: 'event-dev-meetup',
    timeBegin: new Date('2025-01-20T00:00:00-04:00'),
    timeEnd: new Date('2025-02-12T12:00:00-04:00'),
  },
  {
    placeKey: 'place-nocturna-360',
    eventKey: 'event-rooftop-electronica',
    timeBegin: new Date('2025-02-01T00:00:00-04:00'),
    timeEnd: new Date('2025-03-01T02:00:00-04:00'),
  },
  {
    placeKey: 'place-mercado-mercedes',
    eventKey: 'event-ruta-gastronomica',
    timeBegin: new Date('2025-01-28T00:00:00-04:00'),
    timeEnd: new Date('2025-03-02T08:00:00-04:00'),
  },
  {
    placeKey: 'place-santa-rosalia-lab',
    timeBegin: new Date('2025-02-15T00:00:00-04:00'),
    timeEnd: new Date('2025-03-15T23:59:59-04:00'),
  },
];
