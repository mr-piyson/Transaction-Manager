import { hc } from "hono/client";
import { AppType } from "./api";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

const getBaseUrl = () => {
  // 1. If we are in the browser, use relative path or location.origin
  if (typeof window !== "undefined") return window.location.origin;

  // 2. If we are on the server (SSR), use the production URL or localhost
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return "http://localhost:3000";
};

export const client = hc<AppType>(getBaseUrl());
