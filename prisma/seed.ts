import { PrismaClient, Prisma } from '@prisma/client';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';

// Load environment variables
config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Drop cached prepared statements so schema changes don't conflict with old plans
  try {
    await prisma.$executeRawUnsafe('DEALLOCATE ALL');
  } catch (error) {
    console.warn('⚠️  Unable to deallocate prepared statements:', error);
  }

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🗑️  Cleaning existing data...');
  await prisma.bought_Ticket.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.ad.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.request.deleteMany();
  await prisma.community_Member.deleteMany();
  await prisma.report.deleteMany();
  await prisma.review.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.event.deleteMany();
  await prisma.community.deleteMany();
  await prisma.product.deleteMany();
  await prisma.place.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Existing data cleaned\n');

  // ==================== USERS ====================
  console.log('👤 Creating users...');

  const userData: Array<Omit<Prisma.UserCreateInput, 'password'> & { password: string }> = [
    {
      name: 'Juan Carlos',
      lastName: 'Administrador',
      email: 'admin@hackathon.com',
      password: 'admin123',
      birthDate: new Date('1990-01-15'),
      city: 'Caracas',
      country: 'Venezuela',
      gender: 'MAN',
      role: 'ADMIN',
      membership: 'VIP',
      documentId: 12345678,
      image: 'https://i.pravatar.cc/150?img=12',
    },
    {
      name: 'María',
      lastName: 'Promotora',
      email: 'maria@market.com',
      password: 'market123',
      birthDate: new Date('1995-03-20'),
      city: 'Maracaibo',
      country: 'Venezuela',
      gender: 'WOMAN',
      role: 'MARKET',
      membership: 'VIP',
      documentId: 23456789,
      image: 'https://i.pravatar.cc/150?img=5',
    },
    {
      name: 'Pedro',
      lastName: 'García',
      email: 'pedro@gmail.com',
      password: 'client123',
      birthDate: new Date('1998-07-10'),
      city: 'Caracas',
      country: 'Venezuela',
      gender: 'MAN',
      role: 'CLIENT',
      membership: 'NORMAL',
      documentId: 34567890,
      image: 'https://i.pravatar.cc/150?img=33',
    },
    {
      name: 'Ana',
      lastName: 'Martínez',
      email: 'ana@gmail.com',
      password: 'client123',
      birthDate: new Date('2000-11-25'),
      city: 'Valencia',
      country: 'Venezuela',
      gender: 'WOMAN',
      role: 'CLIENT',
      membership: 'VIP',
      documentId: 45678901,
      image: 'https://i.pravatar.cc/150?img=9',
    },
    {
      name: 'Luis',
      lastName: 'Rodríguez',
      email: 'luis@gmail.com',
      password: 'client123',
      birthDate: new Date('1997-05-30'),
      city: 'Barquisimeto',
      country: 'Venezuela',
      gender: 'MAN',
      role: 'CLIENT',
      membership: 'NORMAL',
      documentId: 56789012,
      image: 'https://i.pravatar.cc/150?img=15',
    },
    {
      name: 'Sofia',
      lastName: 'López',
      email: 'sofia@gmail.com',
      password: 'client123',
      birthDate: new Date('1999-09-12'),
      city: 'Caracas',
      country: 'Venezuela',
      gender: 'WOMAN',
      role: 'CLIENT',
      membership: 'VIP',
      documentId: 67890123,
      image: 'https://i.pravatar.cc/150?img=20',
    },
    {
      name: 'Carlos',
      lastName: 'Fernández',
      email: 'carlos@gmail.com',
      password: 'client123',
      birthDate: new Date('1996-04-18'),
      city: 'Mérida',
      country: 'Venezuela',
      gender: 'MAN',
      role: 'CLIENT',
      membership: 'NORMAL',
      documentId: 78901234,
      image: 'https://i.pravatar.cc/150?img=25',
    },
    {
      name: 'Roberto',
      lastName: 'Morales',
      email: 'roberto@market.com',
      password: 'market123',
      birthDate: new Date('1992-08-22'),
      city: 'Caracas',
      country: 'Venezuela',
      gender: 'MAN',
      role: 'MARKET',
      membership: 'VIP',
      documentId: 89012345,
      image: 'https://i.pravatar.cc/150?img=30',
    },
    {
      name: 'Valentina',
      lastName: 'Torres',
      email: 'valentina@gmail.com',
      password: 'client123',
      birthDate: new Date('2001-12-05'),
      city: 'Maracay',
      country: 'Venezuela',
      gender: 'WOMAN',
      role: 'CLIENT',
      membership: 'NORMAL',
      documentId: 90123456,
      image: 'https://i.pravatar.cc/150?img=35',
    },
    {
      name: 'Diego',
      lastName: 'Ramírez',
      email: 'diego@gmail.com',
      password: 'client123',
      birthDate: new Date('1994-06-28'),
      city: 'Caracas',
      country: 'Venezuela',
      gender: 'MAN',
      role: 'CLIENT',
      membership: 'VIP',
      documentId: 11223344,
      image: 'https://i.pravatar.cc/150?img=40',
    },
  ];

  const users = await Promise.all(
    userData.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return prisma.user.create({
        data: {
          ...user,
          password: hashedPassword,
        },
      });
    })
  );

  console.log(`✅ Created ${users.length} users\n`);

  // ==================== PLACES ====================
  console.log('📍 Creating places...');

  const places = await Promise.all([
    prisma.place.create({
      data: {
        name: 'WeWork Las Mercedes',
        direction: 'Av. Río de Janeiro, Las Mercedes',
        city: 'Caracas',
        country: 'Venezuela',
        capacity: 200,
        type: 'coworking',
        ownerId: users[1].id, // María (MARKET)
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c',
        mapUrl: 'https://maps.google.com/?q=WeWork+Las+Mercedes+Caracas',
        igUrl: 'https://instagram.com/wework',
        status: 'ACCEPTED',
      },
    }),

    prisma.place.create({
      data: {
        name: 'Cervecería Tovar',
        direction: 'Av. Francisco de Miranda, El Rosal',
        city: 'Caracas',
        country: 'Venezuela',
        capacity: 150,
        type: 'bar',
        ownerId: users[1].id, // María
        image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b',
        mapUrl: 'https://maps.google.com/?q=Cerveceria+Tovar',
        igUrl: 'https://instagram.com/cervezatovar',
        facebookUrl: 'https://facebook.com/cervezatovar',
        status: 'ACCEPTED',
      },
    }),

    prisma.place.create({
      data: {
        name: 'Centro Cultural BOD',
        direction: 'Av. Andrés Bello, La Castellana',
        city: 'Caracas',
        country: 'Venezuela',
        capacity: 300,
        type: 'cultural',
        ownerId: users[0].id, // Admin
        image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655',
        mapUrl: 'https://maps.google.com/?q=Centro+Cultural+BOD',
        status: 'ACCEPTED',
      },
    }),

    prisma.place.create({
      data: {
        name: 'Club 360° Roof',
        direction: 'Av. Principal de Las Mercedes',
        city: 'Caracas',
        country: 'Venezuela',
        capacity: 500,
        type: 'club',
        ownerId: users[7].id, // Roberto (MARKET)
        image: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2',
        mapUrl: 'https://maps.google.com/?q=Club+360+Caracas',
        igUrl: 'https://instagram.com/club360roof',
        facebookUrl: 'https://facebook.com/club360roof',
        tiktokUrl: 'https://tiktok.com/@club360roof',
        status: 'ACCEPTED',
      },
    }),

    prisma.place.create({
      data: {
        name: 'Restaurante Urrutia',
        direction: 'Av. San Juan Bosco, Altamira',
        city: 'Caracas',
        country: 'Venezuela',
        capacity: 80,
        type: 'restaurant',
        ownerId: users[7].id, // Roberto
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
        mapUrl: 'https://maps.google.com/?q=Restaurante+Urrutia',
        igUrl: 'https://instagram.com/urrutiarestaurante',
        status: 'ACCEPTED',
      },
    }),

    prisma.place.create({
      data: {
        name: 'Teatro Teresa Carreño',
        direction: 'Paseo Colón, Los Caobos',
        city: 'Caracas',
        country: 'Venezuela',
        capacity: 1000,
        type: 'theater',
        ownerId: users[0].id, // Admin
        image: 'https://images.unsplash.com/photo-1503095396549-807759245b35',
        mapUrl: 'https://maps.google.com/?q=Teatro+Teresa+Carreno',
        status: 'ACCEPTED',
      },
    }),

    prisma.place.create({
      data: {
        name: 'Parque El Ávila',
        direction: 'Av. Boyacá, Parque Nacional',
        city: 'Caracas',
        country: 'Venezuela',
        capacity: 2000,
        type: 'park',
        ownerId: users[1].id, // María
        image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
        mapUrl: 'https://maps.google.com/?q=Parque+El+Avila',
        status: 'ACCEPTED',
      },
    }),

    prisma.place.create({
      data: {
        name: 'Bar La Casa Bistró',
        direction: 'Av. Principal de Las Mercedes',
        city: 'Caracas',
        country: 'Venezuela',
        capacity: 120,
        type: 'bar',
        ownerId: users[1].id, // María
        image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34',
        mapUrl: 'https://maps.google.com/?q=La+Casa+Bistro+Caracas',
        igUrl: 'https://instagram.com/lacasabistro',
        status: 'PENDING',
      },
    }),
  ]);

  console.log(`✅ Created ${places.length} places\n`);

  // ==================== PRODUCTS ====================
  console.log('🍺 Creating products...');

  const products = await Promise.all([
    // WeWork products
    prisma.product.create({
      data: {
        name: 'Café con Leche',
        price: 8.50,
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93',
        placeId: places[0].id, // WeWork
      },
    }),
    prisma.product.create({
      data: {
        name: 'Arepa Reina Pepiada',
        price: 15.00,
        image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af',
        placeId: places[0].id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Ensalada Cesar',
        price: 12.50,
        image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1',
        placeId: places[0].id,
      },
    }),

    // Cervecería Tovar products
    prisma.product.create({
      data: {
        name: 'Cerveza Tovar IPA',
        price: 18.00,
        image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9',
        placeId: places[1].id, // Cervecería Tovar
      },
    }),
    prisma.product.create({
      data: {
        name: 'Cerveza Tovar Lager',
        price: 16.00,
        image: 'https://images.unsplash.com/photo-1618183479302-1e0aa382c36b',
        placeId: places[1].id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Tabla de Quesos Venezolanos',
        price: 35.00,
        image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862',
        placeId: places[1].id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Tequeños',
        price: 28.00,
        image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2',
        placeId: places[1].id,
      },
    }),

    // Centro Cultural products
    prisma.product.create({
      data: {
        name: 'Entrada Museo',
        price: 10.00,
        image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3',
        placeId: places[2].id, // Centro Cultural
      },
    }),
    prisma.product.create({
      data: {
        name: 'Tour Guiado',
        price: 20.00,
        image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86',
        placeId: places[2].id,
      },
    }),

    // Club Amadeus products
    prisma.product.create({
      data: {
        name: 'Botella Vodka Premium',
        price: 280.00,
        image: 'https://images.unsplash.com/photo-1560508020-7a46a0a70a3e',
        placeId: places[3].id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Botella Ron Añejo',
        price: 250.00,
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b',
        placeId: places[3].id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Combo Energético',
        price: 30.00,
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97',
        placeId: places[3].id,
      },
    }),

    // Restaurante Urrutia products
    prisma.product.create({
      data: {
        name: 'Menú Degustación 7 pasos',
        price: 180.00,
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0',
        placeId: places[4].id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Pabellón Criollo',
        price: 65.00,
        image: 'https://images.unsplash.com/photo-1590759668628-05b0fc34cf37',
        placeId: places[4].id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Asado Negro',
        price: 55.00,
        image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba',
        placeId: places[4].id,
      },
    }),

    // Bar La Casa Bistró products
    prisma.product.create({
      data: {
        name: 'Mojito Venezolano',
        price: 20.00,
        image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b',
        placeId: places[7].id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Caipirinha',
        price: 18.00,
        image: 'https://images.unsplash.com/photo-1536935338788-846bb9981813',
        placeId: places[7].id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Cachapas con Queso',
        price: 25.00,
        image: 'https://images.unsplash.com/photo-1626266799037-8ce7c6fbb0e1',
        placeId: places[7].id,
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products\n`);

  // ==================== COMMUNITIES ====================
  console.log('🏘️  Creating communities...');

  const communities = await Promise.all([
    prisma.community.create({
      data: {
        name: 'Tech Caracas Community',
        createdBy: {
          connect: { id: users[0].id },
        },
      },
    }),

    prisma.community.create({
      data: {
        name: 'Startup Venezuela',
        createdBy: {
          connect: { id: users[1].id },
        },
      },
    }),

    prisma.community.create({
      data: {
        name: 'Developers Circle VE',
        createdBy: {
          connect: { id: users[2].id },
        },
      },
    }),
  ]);

  console.log(`✅ Created ${communities.length} communities\n`);

  // ==================== COMMUNITY MEMBERS ====================
  console.log('👥 Adding community members...');

  const members = await Promise.all([
    // Tech Lima Community
    prisma.community_Member.create({
      data: {
        userId: users[0].id, // Admin
        communityId: communities[0].id,
        role: 'ADMIN',
      },
    }),
    prisma.community_Member.create({
      data: {
        userId: users[2].id, // Pedro
        communityId: communities[0].id,
        role: 'CLIENT',
      },
    }),
    prisma.community_Member.create({
      data: {
        userId: users[3].id, // Ana
        communityId: communities[0].id,
        role: 'CLIENT',
      },
    }),

    // Startup Perú
    prisma.community_Member.create({
      data: {
        userId: users[1].id, // María
        communityId: communities[1].id,
        role: 'ADMIN',
      },
    }),
    prisma.community_Member.create({
      data: {
        userId: users[4].id, // Luis
        communityId: communities[1].id,
        role: 'CLIENT',
      },
    }),
    prisma.community_Member.create({
      data: {
        userId: users[5].id, // Sofia
        communityId: communities[1].id,
        role: 'CLIENT',
      },
    }),

    // Developers Circle
    prisma.community_Member.create({
      data: {
        userId: users[0].id, // Admin
        communityId: communities[2].id,
        role: 'ADMIN',
      },
    }),
    prisma.community_Member.create({
      data: {
        userId: users[6].id, // Carlos
        communityId: communities[2].id,
        role: 'CLIENT',
      },
    }),
    prisma.community_Member.create({
      data: {
        userId: users[9].id, // Diego
        communityId: communities[2].id,
        role: 'CLIENT',
      },
    }),
  ]);

  console.log(`✅ Added ${members.length} community members\n`);

  // ==================== EVENTS ====================
  console.log('🎉 Creating events...');

  const events = await Promise.all([
    prisma.event.create({
      data: {
        name: 'Meetup JavaScript 2025',
        description: 'Charlas sobre las últimas tendencias en JavaScript y TypeScript',
        timeBegin: new Date('2025-02-15T19:00:00'),
        timeEnd: new Date('2025-02-15T22:00:00'),
        placeId: places[0].id, // WeWork
        organizerId: users[0].id, // Admin
        communityId: communities[0].id,
        minAge: 18,
        status: 'proximo',
        externalUrl: 'https://meetup.com/javascript-caracas',
      },
    }),

    prisma.event.create({
      data: {
        name: 'Startup Weekend Caracas',
        description: '54 horas para crear una startup desde cero',
        timeBegin: new Date('2025-03-20T18:00:00'),
        timeEnd: new Date('2025-03-22T20:00:00'),
        placeId: places[0].id,
        organizerId: users[1].id, // María
        communityId: communities[1].id,
        minAge: 18,
        status: 'proximo',
      },
    }),

    prisma.event.create({
      data: {
        name: 'After Office Tech',
        description: 'Networking y cervezas artesanales venezolanas',
        timeBegin: new Date('2025-02-01T19:00:00'),
        timeEnd: new Date('2025-02-01T23:00:00'),
        placeId: places[1].id, // Cervecería Tovar
        organizerId: users[1].id,
        minAge: 21,
        status: 'proximo',
      },
    }),

    prisma.event.create({
      data: {
        name: 'Noche Electrónica - DJ Set',
        description: 'Los mejores DJs de la escena electrónica venezolana',
        timeBegin: new Date('2025-02-20T23:00:00'),
        timeEnd: new Date('2025-02-21T05:00:00'),
        placeId: places[3].id, // Club 360°
        organizerId: users[7].id, // Roberto
        communityId: communities[2].id,
        minAge: 18,
        status: 'proximo',
        externalUrl: 'https://ticketmundo.com/noche-electronica',
      },
    }),

    prisma.event.create({
      data: {
        name: 'Festival Gastronómico Venezuela',
        description: 'Muestra de los mejores platos de la gastronomía venezolana',
        timeBegin: new Date('2025-03-15T12:00:00'),
        timeEnd: new Date('2025-03-15T22:00:00'),
        placeId: places[6].id, // Parque El Ávila
        organizerId: users[1].id,
        minAge: 0,
        status: 'proximo',
      },
    }),

    prisma.event.create({
      data: {
        name: 'Obra de Teatro: Romeo y Julieta',
        description: 'Adaptación moderna del clásico de Shakespeare',
        timeBegin: new Date('2025-02-25T20:00:00'),
        timeEnd: new Date('2025-02-25T22:30:00'),
        placeId: places[5].id, // Teatro Teresa Carreño
        organizerId: users[0].id,
        minAge: 12,
        status: 'proximo',
      },
    }),

    prisma.event.create({
      data: {
        name: 'Hackathon Venezuela 2025',
        description: '48 horas de código intenso para resolver problemas sociales',
        timeBegin: new Date('2025-04-10T09:00:00'),
        timeEnd: new Date('2025-04-12T18:00:00'),
        placeId: places[0].id, // WeWork
        organizerId: users[0].id,
        communityId: communities[0].id,
        minAge: 16,
        status: 'proximo',
        externalUrl: 'https://hackathonvenezuela.com',
      },
    }),
  ]);

  console.log(`✅ Created ${events.length} events\n`);

  // ==================== TICKETS ====================
  console.log('🎫 Creating tickets...');

  const tickets = await Promise.all([
    // Meetup JavaScript - General
    prisma.ticket.create({
      data: {
        eventId: events[0].id,
        type: 'General',
        price: 0, // Free
        quantity: 50,
        description: 'Entrada general gratuita',
      },
    }),

    // Meetup JavaScript - VIP
    prisma.ticket.create({
      data: {
        eventId: events[0].id,
        type: 'VIP',
        price: 25,
        quantity: 20,
        description: 'Acceso VIP con networking exclusivo',
      },
    }),

    // Startup Weekend - Early Bird
    prisma.ticket.create({
      data: {
        eventId: events[1].id,
        type: 'Early Bird',
        price: 50,
        quantity: 30,
        description: 'Precio especial para los primeros inscritos',
      },
    }),

    // Startup Weekend - Regular
    prisma.ticket.create({
      data: {
        eventId: events[1].id,
        type: 'Regular',
        price: 80,
        quantity: 50,
        description: 'Entrada regular al evento',
      },
    }),

    // After Office - General
    prisma.ticket.create({
      data: {
        eventId: events[2].id,
        type: 'General',
        price: 15,
        quantity: 100,
        description: 'Incluye 2 cervezas artesanales',
      },
    }),

    // Noche Electrónica - General
    prisma.ticket.create({
      data: {
        eventId: events[3].id,
        type: 'General',
        price: 40,
        quantity: 300,
        description: 'Entrada general a la pista de baile',
      },
    }),

    // Noche Electrónica - VIP
    prisma.ticket.create({
      data: {
        eventId: events[3].id,
        type: 'VIP',
        price: 80,
        quantity: 100,
        description: 'Área VIP con mesa reservada y botella',
      },
    }),

    // Festival Gastronómico - Entrada
    prisma.ticket.create({
      data: {
        eventId: events[4].id,
        type: 'General',
        price: 10,
        quantity: 500,
        description: 'Entrada al festival',
      },
    }),

    // Obra de Teatro - Platea
    prisma.ticket.create({
      data: {
        eventId: events[5].id,
        type: 'Platea',
        price: 60,
        quantity: 150,
        description: 'Asientos en platea',
      },
    }),

    // Obra de Teatro - Balcón
    prisma.ticket.create({
      data: {
        eventId: events[5].id,
        type: 'Balcón',
        price: 35,
        quantity: 100,
        description: 'Asientos en balcón',
      },
    }),

    // Hackathon - Competidor
    prisma.ticket.create({
      data: {
        eventId: events[6].id,
        type: 'Competidor',
        price: 0,
        quantity: 100,
        description: 'Entrada como competidor del hackathon',
      },
    }),

    // Hackathon - Espectador
    prisma.ticket.create({
      data: {
        eventId: events[6].id,
        type: 'Espectador',
        price: 0,
        quantity: 50,
        description: 'Entrada como espectador',
      },
    }),
  ]);

  console.log(`✅ Created ${tickets.length} tickets\n`);

  // ==================== BOUGHT TICKETS ====================
  console.log('💳 Creating bought tickets...');

  const boughtTickets = await Promise.all([
    prisma.bought_Ticket.create({
      data: {
        userId: users[2].id, // Pedro
        ticketId: tickets[0].id, // Meetup JS - General
        price: tickets[0].price,
      },
    }),

    prisma.bought_Ticket.create({
      data: {
        userId: users[3].id, // Ana
        ticketId: tickets[1].id, // Meetup JS - VIP
        price: tickets[1].price,
      },
    }),

    prisma.bought_Ticket.create({
      data: {
        userId: users[4].id, // Luis
        ticketId: tickets[2].id, // Startup Weekend - Early Bird
        price: tickets[2].price,
      },
    }),

    prisma.bought_Ticket.create({
      data: {
        userId: users[5].id, // Sofia
        ticketId: tickets[5].id, // Noche Electrónica - General
        price: tickets[5].price,
      },
    }),

    prisma.bought_Ticket.create({
      data: {
        userId: users[6].id, // Carlos
        ticketId: tickets[6].id, // Noche Electrónica - VIP
        price: tickets[6].price,
      },
    }),

    prisma.bought_Ticket.create({
      data: {
        userId: users[9].id, // Diego
        ticketId: tickets[8].id, // Obra de Teatro - Platea
        price: tickets[8].price,
      },
    }),

    prisma.bought_Ticket.create({
      data: {
        userId: users[8].id, // Valentina
        ticketId: tickets[7].id, // Festival Gastronómico
        price: tickets[7].price,
      },
    }),
  ]);

  // Update ticket quantities
  await prisma.ticket.update({
    where: { id: tickets[0].id },
    data: { quantity: { decrement: 1 } },
  });
  await prisma.ticket.update({
    where: { id: tickets[1].id },
    data: { quantity: { decrement: 1 } },
  });
  await prisma.ticket.update({
    where: { id: tickets[2].id },
    data: { quantity: { decrement: 1 } },
  });
  await prisma.ticket.update({
    where: { id: tickets[5].id },
    data: { quantity: { decrement: 1 } },
  });
  await prisma.ticket.update({
    where: { id: tickets[6].id },
    data: { quantity: { decrement: 1 } },
  });
  await prisma.ticket.update({
    where: { id: tickets[7].id },
    data: { quantity: { decrement: 1 } },
  });
  await prisma.ticket.update({
    where: { id: tickets[8].id },
    data: { quantity: { decrement: 1 } },
  });

  console.log(`✅ Created ${boughtTickets.length} bought tickets\n`);

  // ==================== REQUESTS ====================
  console.log('📋 Creating requests...');

  const requests = await Promise.all([
    // Pending request
    prisma.request.create({
      data: {
        fromId: users[4].id, // Luis
        communityId: communities[0].id, // Tech Lima
        status: 'PENDING',
      },
    }),

    // Accepted request
    prisma.request.create({
      data: {
        fromId: users[3].id, // Ana
        communityId: communities[0].id,
        status: 'ACCEPTED',
        acceptedById: users[0].id,
      },
    }),

    prisma.request.create({
      data: {
        fromId: users[8].id, // Valentina
        communityId: communities[1].id, // Startup Perú
        status: 'PENDING',
      },
    }),

    prisma.request.create({
      data: {
        fromId: users[5].id, // Sofia
        communityId: communities[2].id, // Developers Circle
        status: 'ACCEPTED',
        acceptedById: users[0].id,
      },
    }),

    prisma.request.create({
      data: {
        fromId: users[2].id, // Pedro
        communityId: communities[1].id,
        status: 'REJECTED',
        acceptedById: users[1].id,
      },
    }),
  ]);

  console.log(`✅ Created ${requests.length} requests\n`);

  // ==================== INVITATIONS ====================
  console.log('💌 Creating invitations...');

  const invitations = await Promise.all([
    prisma.invitation.create({
      data: {
        fromId: users[0].id, // Admin invites Luis
        toId: users[4].id,
        placeId: places[0].id,
        eventId: events[0].id,
        status: 'PENDING',
        invitationDate: new Date('2025-02-15T19:00:00'),
      },
    }),

    prisma.invitation.create({
      data: {
        fromId: users[2].id, // Pedro invites Ana
        toId: users[3].id,
        placeId: places[1].id,
        eventId: events[2].id,
        status: 'ACCEPTED',
        invitationDate: new Date('2025-02-01T19:00:00'),
      },
    }),

    prisma.invitation.create({
      data: {
        fromId: users[5].id, // Sofia invites Carlos
        toId: users[6].id,
        placeId: places[3].id,
        eventId: events[3].id,
        status: 'ACCEPTED',
        invitationDate: new Date('2025-02-20T23:00:00'),
      },
    }),

    prisma.invitation.create({
      data: {
        fromId: users[1].id, // María invites Diego
        toId: users[9].id,
        placeId: places[6].id,
        eventId: events[4].id,
        status: 'PENDING',
        invitationDate: new Date('2025-03-15T12:00:00'),
      },
    }),

    prisma.invitation.create({
      data: {
        fromId: users[9].id, // Diego invites Valentina
        toId: users[8].id,
        placeId: places[5].id,
        eventId: events[5].id,
        status: 'REJECTED',
        invitationDate: new Date('2025-02-25T20:00:00'),
      },
    }),

    prisma.invitation.create({
      data: {
        fromId: users[0].id, // Admin invites multiple users to Hackathon
        toId: users[2].id,
        placeId: places[0].id,
        eventId: events[6].id,
        status: 'ACCEPTED',
        invitationDate: new Date('2025-04-10T09:00:00'),
      },
    }),
  ]);

  console.log(`✅ Created ${invitations.length} invitations\n`);

  // ==================== REVIEWS ====================
  console.log('⭐ Creating reviews...');

  const reviews = await Promise.all([
    prisma.review.create({
      data: {
        userId: users[2].id,
        placeId: places[0].id,
        eventId: events[0].id,
        calification: 5,
        comment: 'Excelente evento, muy bien organizado!',
      },
    }),

    prisma.review.create({
      data: {
        userId: users[3].id,
        placeId: places[1].id,
        calification: 4,
        comment: 'Buen ambiente, aunque un poco lleno',
      },
    }),

    prisma.review.create({
      data: {
        userId: users[5].id,
        placeId: places[3].id, // Club Amadeus
        eventId: events[3].id,
        calification: 5,
        comment: '¡Increíble noche! Los DJs estuvieron espectaculares',
      },
    }),

    prisma.review.create({
      data: {
        userId: users[6].id,
        placeId: places[4].id, // Restaurante Astrid y Gastón
        calification: 5,
        comment: 'La mejor experiencia gastronómica de mi vida',
      },
    }),

    prisma.review.create({
      data: {
        userId: users[4].id,
        placeId: places[1].id,
        calification: 5,
        comment: 'Las cervezas artesanales son de otro nivel',
      },
    }),

    prisma.review.create({
      data: {
        userId: users[9].id,
        placeId: places[5].id, // Teatro Municipal
        eventId: events[5].id,
        calification: 4,
        comment: 'Muy buena adaptación de la obra clásica',
      },
    }),

    prisma.review.create({
      data: {
        userId: users[8].id,
        placeId: places[6].id, // Parque Kennedy
        eventId: events[4].id,
        calification: 5,
        comment: 'Festival increíble, probé platos deliciosos',
      },
    }),

    prisma.review.create({
      data: {
        userId: users[2].id,
        placeId: places[0].id,
        calification: 4,
        comment: 'Excelente espacio de coworking',
      },
    }),

    prisma.review.create({
      data: {
        userId: users[3].id,
        placeId: places[3].id,
        calification: 3,
        comment: 'Bueno pero la música a veces está muy alta',
      },
    }),
  ]);

  console.log(`✅ Created ${reviews.length} reviews\n`);

  // ==================== PROMOTIONS ====================
  console.log('🎁 Creating promotions...');

  const promotions = await Promise.all([
    // Product promotions
    prisma.promotion.create({
      data: {
        type: 'PRODUCT',
        productId: products[3].id, // Cerveza IPA
        membership: 'VIP',
        discount: 20,
        timeBegin: new Date('2025-01-01T00:00:00'),
        timeEnd: new Date('2025-12-31T23:59:59'),
      },
    }),
    prisma.promotion.create({
      data: {
        type: 'PRODUCT',
        productId: products[5].id, // Tabla de Quesos
        membership: 'NORMAL',
        discount: 15,
        timeBegin: new Date('2025-02-01T00:00:00'),
        timeEnd: new Date('2025-02-28T23:59:59'),
      },
    }),
    prisma.promotion.create({
      data: {
        type: 'PRODUCT',
        productId: products[0].id, // Café Americano
        membership: 'VIP',
        discount: 10,
        timeBegin: new Date('2025-01-15T00:00:00'),
        timeEnd: new Date('2025-03-15T23:59:59'),
      },
    }),

    // Ticket promotions
    prisma.promotion.create({
      data: {
        type: 'TICKET',
        ticketId: tickets[1].id, // Meetup JS - VIP
        membership: 'VIP',
        discount: 30,
        timeBegin: new Date('2025-01-01T00:00:00'),
        timeEnd: new Date('2025-02-14T23:59:59'),
      },
    }),
    prisma.promotion.create({
      data: {
        type: 'TICKET',
        ticketId: tickets[2].id, // Startup Weekend - Early Bird
        membership: 'NORMAL',
        discount: 25,
        timeBegin: new Date('2025-02-01T00:00:00'),
        timeEnd: new Date('2025-03-10T23:59:59'),
      },
    }),
  ]);

  console.log(`✅ Created ${promotions.length} promotions\n`);

  // ==================== ADS ====================
  console.log('📢 Creating ads...');

  const ads = await Promise.all([
    // Place ads
    prisma.ad.create({
      data: {
        placeId: places[0].id, // WeWork
        eventId: events[0].id,
        timeBegin: new Date('2025-02-01T00:00:00'),
        timeEnd: new Date('2025-02-28T23:59:59'),
      },
    }),
    prisma.ad.create({
      data: {
        placeId: places[1].id, // Barranco Beer
        eventId: events[2].id,
        timeBegin: new Date('2025-01-20T00:00:00'),
        timeEnd: new Date('2025-02-05T23:59:59'),
      },
    }),
    prisma.ad.create({
      data: {
        placeId: places[0].id,
        eventId: events[1].id, // Startup Weekend
        timeBegin: new Date('2025-03-01T00:00:00'),
        timeEnd: new Date('2025-03-25T23:59:59'),
      },
    }),
    prisma.ad.create({
      data: {
        placeId: places[2].id, // Centro Cultural
        timeBegin: new Date('2025-01-01T00:00:00'),
        timeEnd: new Date('2025-06-30T23:59:59'),
      },
    }),
  ]);

  console.log(`✅ Created ${ads.length} ads\n`);

  // ==================== REPORTS ====================
  console.log('🚨 Creating reports...');

  const reports = await Promise.all([
    prisma.report.create({
      data: {
        fromId: users[2].id, // Pedro reports
        toId: users[4].id, // Luis
        description: 'Comportamiento inapropiado en el evento',
      },
    }),
    prisma.report.create({
      data: {
        fromId: users[3].id, // Ana reports
        toId: users[4].id, // Luis
        description: 'Spam en los comentarios',
      },
    }),
  ]);

  console.log(`✅ Created ${reports.length} reports\n`);

  // ==================== CATEGORIES ====================
  console.log('📁 Creating categories...');

  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Tecnología',
        createdBy: users[0].id, // Admin
      },
    }),
    prisma.category.create({
      data: {
        name: 'Gastronomía',
        createdBy: users[0].id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Entretenimiento',
        createdBy: users[0].id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Deportes',
        createdBy: users[0].id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Cultura',
        createdBy: users[0].id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Educación',
        createdBy: users[0].id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Negocios',
        createdBy: users[0].id,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Música',
        createdBy: users[0].id,
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories\n`);

  // ==================== SUMMARY ====================
  console.log('📊 Seed Summary:');
  console.log('================');
  console.log(`👤 Users: ${users.length}`);
  console.log(`📍 Places: ${places.length}`);
  console.log(`� Products: ${products.length}`);
  console.log(`�🏘️  Communities: ${communities.length}`);
  console.log(`👥 Community Members: ${members.length}`);
  console.log(`🎉 Events: ${events.length}`);
  console.log(`🎫 Tickets: ${tickets.length}`);
  console.log(`💳 Bought Tickets: ${boughtTickets.length}`);
  console.log(`📋 Requests: ${requests.length}`);
  console.log(`💌 Invitations: ${invitations.length}`);
  console.log(`⭐ Reviews: ${reviews.length}`);
  console.log(`🎁 Promotions: ${promotions.length}`);
  console.log(`📢 Ads: ${ads.length}`);
  console.log(`🚨 Reports: ${reports.length}`);
  console.log(`📁 Categories: ${categories.length}`);
  console.log('================\n');

  console.log('✅ Seed completed successfully! 🎉\n');

  console.log('📝 Test Credentials:');
  console.log('====================');
  console.log('Admin:  admin@hackathon.com  / admin123');
  console.log('Market: maria@market.com     / market123');
  console.log('Client: pedro@gmail.com      / client123');
  console.log('Client: ana@gmail.com        / client123');
  console.log('Client: luis@gmail.com       / client123');
  console.log('====================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
