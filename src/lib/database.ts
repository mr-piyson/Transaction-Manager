import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env";
import { logger } from "../../utils/logger.util";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient;
}

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

const db = new PrismaClient({
  adapter,
  log: [
    { level: "query", emit: "event" },
    { level: "error", emit: "stdout" },
    { level: "warn", emit: "stdout" },
  ],
});

if (process.env.NODE_ENV !== "production") global.prisma = db;

// Log queries in development
// db.$on("query", e => {
//   if (process.env.NODE_ENV === "development") {
//     logger.debug(`Query: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`);
//   }
// });

export default db;
