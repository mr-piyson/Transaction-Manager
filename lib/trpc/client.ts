import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/_root";

export const trpc = createTRPCReact<AppRouter>({});
