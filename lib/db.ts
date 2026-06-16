import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { env } from './env';

declare global {
  var prisma: PrismaClient;
}

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

const db = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'minimal',
  adapter,
});

if (process.env.NODE_ENV !== 'production') global.prisma = db;

export default db;
