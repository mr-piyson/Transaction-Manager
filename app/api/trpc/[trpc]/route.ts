import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createContext } from '@/lib/trpc/server';
import { appRouter } from '@/server/_root';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError: ({ path, error }) => {
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ tRPC failed on ${path ?? '<no-path>'}: ${error}`);
      }
    },
  });

export { handler as GET, handler as POST };
