"use server";

import { auth } from "@/lib/auth-server";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = await toNextJsHandler(auth.handler);