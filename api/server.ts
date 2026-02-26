import Elysia from "elysia";
import { ForbiddenError } from "@casl/ability";

export const app = new Elysia({ prefix: "/api" });

// Export the type for Eden Treaty RPC
export type App = typeof app;
