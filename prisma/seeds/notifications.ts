import { NotificationSeed } from './types';

export const notifications: NotificationSeed[] = [
  {
    userKey: 'client-daniela',
    title: 'Bienvenida a Innovadores Caracas',
    message: 'Tu solicitud fue aprobada. Nos vemos el 12 de febrero en Altamira Hub.',
  },
  {
    userKey: 'client-ricardo',
    title: 'Preventa Rooftop',
    message: 'Quedan pocas mesas Sky Lounge para Nocturna 360. Aprovecha el descuento VIP.',
  },
  {
    userKey: 'client-natalia',
    title: 'Confirmacion Sunrise Training',
    message: 'Recuerda llegar 15 minutos antes y llevar tu esterilla personal.',
  },
  {
    userKey: 'client-luisa',
    title: 'Acceso Podcast Makers',
    message: 'Tu pase Pro incluye 60 minutos extra de estudio. Agenda tu turno.',
    read: true,
  },
  {
    userKey: 'market-sofia',
    title: 'Nuevo review en Mercado Urbano',
    message: 'Elisabeth califico con 4 estrellas la ruta Sabores del Bolivar.',
  },
];
