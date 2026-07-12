import { z } from 'zod';
import { orgProcedure, router } from '@/lib/trpc/context';
import db from '@/lib/db';

export const currenciesRouter = router({
  list: orgProcedure.query(async () => {
    const currencies = await db.currency.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
    return currencies;
  }),

  listAll: orgProcedure.query(async () => {
    return db.currency.findMany({ orderBy: { code: 'asc' } });
  }),

  get: orgProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      return db.currency.findUnique({ where: { code: input.code } });
    }),

  upsert: orgProcedure
    .input(
      z.object({
        code: z.string().length(3),
        name: z.string(),
        symbol: z.string(),
        precision: z.number().int().min(0).max(6),
        separator: z.string().default(','),
        decimal: z.string().default('.'),
      })
    )
    .mutation(async ({ input }) => {
      return db.currency.upsert({
        where: { code: input.code },
        update: {
          name: input.name,
          symbol: input.symbol,
          precision: input.precision,
          separator: input.separator,
          decimal: input.decimal,
          syncSource: 'MANUAL',
        },
        create: {
          ...input,
          isActive: true,
          syncSource: 'MANUAL',
        },
      });
    }),

  deactivate: orgProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input }) => {
      return db.currency.update({
        where: { code: input.code },
        data: { isActive: false },
      });
    }),

  reactivate: orgProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input }) => {
      return db.currency.update({
        where: { code: input.code },
        data: { isActive: true },
      });
    }),
});
