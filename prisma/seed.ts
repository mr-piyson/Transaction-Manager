/**
 * Main seed entry point — runs `prisma db seed`.
 * Uses modular seed data from ./seed/ directory.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { seedRoles, seedPermissions, seedCurrencies } from './seed/index';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding system roles...');
  const roleCount = await seedRoles(db);
  console.log(`Seeded ${roleCount} system roles.`);

  console.log('Seeding permissions...');
  const permCount = await seedPermissions(db);
  console.log(`Seeded ${permCount} permissions.`);

  console.log('Seeding currencies...');
  const currCount = await seedCurrencies(db);
  console.log(`Seeded ${currCount} currencies.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
