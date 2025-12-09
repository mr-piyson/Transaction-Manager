import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient;
}

const db = global.prisma || new PrismaClient();
export default db;

if (process.env.NODE_ENV !== "production") global.prisma = db;

// init default settings
