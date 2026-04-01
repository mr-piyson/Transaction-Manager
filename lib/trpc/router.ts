import z from 'zod';
import { base, router } from '@/lib/trpc/server';

export const appRouter = router({
  hello: base.input(z.object({ name: z.string().optional() })).query(({ input }) => {
    return { greeting: `Hello, ${input.name ?? 'world'}!` };
  }),
});

export type AppRouter = typeof appRouter;
