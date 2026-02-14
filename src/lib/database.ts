import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient;
}
// if (env.DATABASE === "postgresql") {
//   const adapter = new PrismaPg({
//     connectionString: env.DATABASE_URL,
//   });

//   const db = new PrismaClient({
//     adapter,
//   });
// }
// const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || "" });

// const db =
//   global.prisma ||
//   new PrismaClient({
//     adapter: adapter,
//   });

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

const db = new PrismaClient({
  adapter,
});
export default db;

if (process.env.NODE_ENV !== "production") global.prisma = db;

// init default settings
