import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
// import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient;
}

// const adapter = new PrismaPg({
//   connectionString: env.DATABASE_URL,
// });

const adapter = new PrismaLibSql({
  url: env.DATABASE_URL,
});

const db = new PrismaClient({
  adapter,
});

if (process.env.NODE_ENV !== 'production') global.prisma = db;

// Log queries in development
// db.$on("query", e => {
//   if (process.env.NODE_ENV === "development") {
//     logger.debug(`Query: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`);
//   }
// });
seed();
export default db;

// add seed data
async function seed() {
  const organizationExists = await db.organization.findFirst();
  const isCategoryExists = await db.itemCategory.count();
  if (isCategoryExists === 0) {
    await db.itemCategory.upsert({
      where: { name: 'Others' },
      create: {
        name: 'Others',
        color: 'blue',
        organizationId: organizationExists?.id || '',
      },
      update: {},
    });
  }
}
