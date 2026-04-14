import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import type { AppRouter } from '@/server/_routers';

export const trpc = createTRPCReact<AppRouter>({});
