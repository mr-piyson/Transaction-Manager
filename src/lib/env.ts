import { z } from "zod";
import { createEnv } from "@t3-oss/env-core";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string(),
    SECRET_KEY: z.string(),
  },
  runtimeEnv: process.env,
});
