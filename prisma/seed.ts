import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

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
  
  const users = await Promise.all([
    // Admin user
    prisma.user.create({
      data: {
        name: 'Juan Carlos',
        lastName: 'Administrador',
        email: 'admin@hackathon.com',
        password: 'admin123', // Remember to hash in production!
        birthDate: new Date('1990-01-15'),
        city: 'Lima',
        country: 'Perú',
        gender: 'MAN',
        role: 'ADMIN',
        membership: 'VIP',
        documentId: 12345678,
        image: 'https://i.pravatar.cc/150?img=12',
      },
    }),
    
    // Market users
    prisma.user.create({
      data: {
        name: 'María',
        lastName: 'Promotora',
        email: 'maria@market.com',
        password: 'market123',
        birthDate: new Date('1995-03-20'),
        city: 'Arequipa',
        country: 'Perú',
        gender: 'WOMAN',
        role: 'MARKET',
        membership: 'VIP',
        documentId: 23456789,
        image: 'https://i.pravatar.cc/150?img=5',
      },
    }),
    
    // Client users
    prisma.user.create({
      data: {
        name: 'Pedro',
        lastName: 'García',
        email: 'pedro@gmail.com',
        password: 'client123',
        birthDate: new Date('1998-07-10'),
        city: 'Lima',
        country: 'Perú',
        gender: 'MAN',
        role: 'CLIENT',
        membership: 'NORMAL',
        documentId: 34567890,
        image: 'https://i.pravatar.cc/150?img=33',
      },
    }),
    
    prisma.user.create({
      data: {
        name: 'Ana',
        lastName: 'Martínez',
        email: 'ana@gmail.com',
        password: 'client123',
        birthDate: new Date('2000-11-25'),
        city: 'Cusco',
        country: 'Perú',
        gender: 'WOMAN',
        role: 'CLIENT',
        membership: 'VIP',
        documentId: 45678901,
        image: 'https://i.pravatar.cc/150?img=9',
      },
    }),
    
    prisma.user.create({
      data: {
        name: 'Luis',
        lastName: 'Rodríguez',
        email: 'luis@gmail.com',
        password: 'client123',
        birthDate: new Date('1997-05-30'),
        city: 'Trujillo',
        country: 'Perú',
        gender: 'MAN',
        role: 'CLIENT',
        membership: 'NORMAL',
        documentId: 56789012,
        image: 'https://i.pravatar.cc/150?img=15',
      },
    }),
  ]);
  
  console.log(`✅ Created ${users.length} users\n`);

  // ==================== PLACES ====================
  console.log('📍 Creating places...');
  
  const places = await Promise.all([
    prisma.place.create({
      data: {
        name: 'WeWork San Isidro',
        direction: 'Av. Victor Andrés Belaunde 147',
        city: 'Lima',
        country: 'Perú',
        capacity: 200,
        type: 'coworking',
        proprietorId: users[1].id, // María (MARKET)
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c',
        mapUrl: 'https://maps.google.com/?q=WeWork+San+Isidro',
        igUrl: 'https://instagram.com/wework',
        status: 'ACCEPTED',
      },
    }),
    
    prisma.place.create({
      data: {
        name: 'Barranco Beer Company',
        direction: 'Jr. Grau 308',
        city: 'Lima',
        country: 'Perú',
        capacity: 150,
        type: 'bar',
        proprietorId: users[1].id, // María
        image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b',
        mapUrl: 'https://maps.google.com/?q=Barranco+Beer',
        igUrl: 'https://instagram.com/barrancobeers',
        facebookUrl: 'https://facebook.com/barrancobeers',
        status: 'ACCEPTED',
      },
    }),
    
    prisma.place.create({
      data: {
        name: 'Centro Cultural PUCP',
        direction: 'Av. Camino Real 1075',
        city: 'Lima',
        country: 'Perú',
        capacity: 300,
        type: 'cultural',
        proprietorId: users[0].id, // Admin
        image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655',
        mapUrl: 'https://maps.google.com/?q=Centro+Cultural+PUCP',
        status: 'ACCEPTED',
      },
    }),
  ]);
  
  console.log(`✅ Created ${places.length} places\n`);

  // ==================== COMMUNITIES ====================
  console.log('🏘️  Creating communities...');
  
  const communities = await Promise.all([
    prisma.community.create({
      data: {
        name: 'Tech Lima Community',
      },
    }),
    
    prisma.community.create({
      data: {
        name: 'Startup Perú',
      },
    }),
    
    prisma.community.create({
      data: {
        name: 'Developers Circle',
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
        externalUrl: 'https://meetup.com/javascript-lima',
      },
    }),
    
    prisma.event.create({
      data: {
        name: 'Startup Weekend Lima',
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
        description: 'Networking y cervezas artesanales',
        timeBegin: new Date('2025-02-01T19:00:00'),
        timeEnd: new Date('2025-02-01T23:00:00'),
        placeId: places[1].id, // Barranco Beer
        organizerId: users[1].id,
        minAge: 21,
        status: 'proximo',
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
  ]);
  
  console.log(`✅ Created ${reviews.length} reviews\n`);

  // ==================== SUMMARY ====================
  console.log('📊 Seed Summary:');
  console.log('================');
  console.log(`👤 Users: ${users.length}`);
  console.log(`📍 Places: ${places.length}`);
  console.log(`🏘️  Communities: ${communities.length}`);
  console.log(`👥 Community Members: ${members.length}`);
  console.log(`🎉 Events: ${events.length}`);
  console.log(`🎫 Tickets: ${tickets.length}`);
  console.log(`💳 Bought Tickets: ${boughtTickets.length}`);
  console.log(`📋 Requests: ${requests.length}`);
  console.log(`💌 Invitations: ${invitations.length}`);
  console.log(`⭐ Reviews: ${reviews.length}`);
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
