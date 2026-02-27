import { Elysia, ValidationError } from "elysia";
import { ApiResponse } from "@/lib/api";
import { env } from "@/lib/env";
import { z } from "zod";

const isDevelopment = process.env.NODE_ENV !== "production";
export type API = typeof app;
export const app = new Elysia({ prefix: "/api" });
