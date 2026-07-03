import { publicProcedure, t } from '@/lib/trpc/context';

export const hrRouter = t.router({
  health: publicProcedure.query(() => ({ status: 'ok', module: 'hr' })),
});

export type HrRouter = typeof hrRouter;
