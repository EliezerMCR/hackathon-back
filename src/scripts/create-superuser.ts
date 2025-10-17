import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const [name, email, password] = process.argv.slice(2);

  if (!name || !email || !password) {
    console.error('Usage: npm run create-superuser <name> <email> <password>');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        lastName: 'Admin',
        email,
        password: hashedPassword,
        birthDate: new Date(),
        gender: 'MAN',
        role: 'ADMIN',
        documentId: 0,
      },
    });

    console.log(`Superuser ${user.name} created successfully`);
  } catch (error) {
    console.error('Error creating superuser:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
