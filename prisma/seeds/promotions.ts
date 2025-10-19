import { Membership, PromotionType } from '@prisma/client';

import { PromotionSeed } from './types';

export const promotions: PromotionSeed[] = [
  {
    type: PromotionType.PRODUCT,
    productKey: 'product-arepa-llanera',
    membership: Membership.VIP,
    discount: 20,
    timeBegin: new Date('2025-02-01T00:00:00-04:00'),
    timeEnd: new Date('2025-02-28T23:59:59-04:00'),
  },
  {
    type: PromotionType.PRODUCT,
    productKey: 'product-cafe-coldbrew',
    membership: Membership.NORMAL,
    discount: 15,
    timeBegin: new Date('2025-02-05T00:00:00-04:00'),
    timeEnd: new Date('2025-03-05T23:59:59-04:00'),
  },
  {
    type: PromotionType.TICKET,
    ticketKey: 'ticket-rooftop-vip',
    membership: Membership.VIP,
    discount: 25,
    timeBegin: new Date('2025-02-10T00:00:00-04:00'),
    timeEnd: new Date('2025-02-27T23:59:59-04:00'),
  },
  {
    type: PromotionType.TICKET,
    ticketKey: 'ticket-waraira-solo',
    membership: Membership.NORMAL,
    discount: 30,
    timeBegin: new Date('2025-01-25T00:00:00-04:00'),
    timeEnd: new Date('2025-02-08T23:59:59-04:00'),
  },
  {
    type: PromotionType.PRODUCT,
    productKey: 'product-santarosalia-pod',
    membership: Membership.VIP,
    discount: 18,
    timeBegin: new Date('2025-03-01T00:00:00-04:00'),
  },
];