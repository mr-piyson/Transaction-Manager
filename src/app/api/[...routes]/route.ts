import { app } from "@/api/server";

// Mount Elysia into Next.js App Router
export const GET = app.handle;
export const POST = app.handle;
export const PUT = app.handle;
export const PATCH = app.handle;
export const DELETE = app.handle;
export const OPTIONS = app.handle;
