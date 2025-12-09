import "dotenv/config"; // For loading env vars
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"), // Use your actual DB URL env var
  },
});
