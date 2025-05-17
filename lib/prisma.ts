import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    log: ['error', 'warn'],
    errorFormat: 'minimal',
  });
};

// Check if we're running in production
const isProduction = process.env.NODE_ENV === 'production';

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prismaClientSingleton();
}

const prisma = globalForPrisma.prisma;

// Add connection handling
prisma.$connect()
  .then(() => {
    console.log('Successfully connected to the database');
  })
  .catch((e) => {
    console.error('Failed to connect to the database:', e);
  });

export default prisma; 