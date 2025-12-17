import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient;
}

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || "" });
export const prisma = new PrismaClient({ adapter });

const db =
  global.prisma ||
  new PrismaClient({
    adapter: adapter,
  });
export default db;

if (process.env.NODE_ENV !== "production") global.prisma = db;

// init default settings
