import { z } from 'zod';
import { authed, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';

export const contractRouter = t.router({
  getContracts: authed.query(async () => {
    try {
      return await db.contract.findMany({});
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch contracts',
      });
    }
  }),

  getContractById: authed
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      try {
        const item = await db.contract.findUnique({
          where: { id: String(input.id) },
        });
        if (!item) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Contract not found',
          });
        }
        return item;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch contract',
        });
      }
    }),

  createContract: authed
    .input(z.any())
    .mutation(async ({ input }) => {
      try {
        return await db.contract.create({
          data: input,
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create contract',
        });
      }
    }),
});
