
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  const adminUsers = [
    {
      name: 'Admin',
      lastName: 'User1',
      email: 'admin1@example.com',
      password: 'password123',
      role: 'ADMIN',
      gender: "MAN"
    },
    {
      name: 'Admin',
      lastName: 'User2',
      email: 'admin2@example.com',
      password: 'password123',
      role: 'ADMIN',
      gender: "MAN"
    },
  ];

  const clientUsers = [
    {
      name: 'Client',
      lastName: 'User1',
      email: 'client1@example.com',
      password: 'password123',
      role: 'CLIENT',
      gender: "MAN"
    },
    {
      name: 'Client',
      lastName: 'User2',
      email: 'client2@example.com',
      password: 'password123',
      role: 'CLIENT',
      gender: "MAN"
    },
  ];

  for (const userData of adminUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    await prisma.user.create({
      data: {
        name: userData.name,
        lastName: userData.lastName,
        email: userData.email,
        password: hashedPassword,
        birthDate: new Date(),
        gender: 'MAN',
        documentId: 0,
        role: 'ADMIN',
      },
    });
  }

  for (const userData of clientUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    await prisma.user.create({
      data: {
        name: userData.name,
        lastName: userData.lastName,
        email: userData.email,
        password: hashedPassword,
        birthDate: new Date(),
        gender: 'MAN',
        documentId: 0,
        role: 'CLIENT',
      },
    });
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
