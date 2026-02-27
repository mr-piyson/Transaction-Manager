"use client";
import { createEdenTanStackQuery } from "eden-tanstack-react-query";
import type { API } from "@/api/server"; // Your Elysia App type
import { treaty } from "@elysiajs/eden";

// This creates an Eden-aware provider and hook
export const { EdenProvider, useEden } = createEdenTanStackQuery<API>();
export const edenClient = treaty<API>("localhost:3005");
