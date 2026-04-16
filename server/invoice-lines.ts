import { z } from 'zod';
import { protectedProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';

export const invoiceLinesRouter = t.router({
  createInvoiceLine: protectedProcedure
    .input(
      z.object({
        data: z.object({
          description: z.string(),
          quantity: z.coerce.string(),
          purchasePrice: z.coerce.bigint(),
          unitPrice: z.coerce.bigint(),
          discountAmt: z.coerce.bigint(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const { data } = input;
      try {
        return await db.$transaction(async (tx) => {
          let newLine = {};

          return newLine;
        });
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create invoice line',
        });
      }
    }),

  updateInvoiceLine: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string(),
        quantity: z.string(),
        purchasePrice: z.bigint(),
        unitPrice: z.bigint(),
        discountAmt: z.bigint(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const line = await db.invoiceLine.update({
          where: { id: input.id },
          data: {
            description: input.description,
            quantity: input.quantity,
            purchasePrice: input.purchasePrice,
            unitPrice: input.unitPrice,
            discountAmt: input.discountAmt,
          },
          include: {
            item: true,
          },
        });

        return line;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update invoice line',
        });
      }
    }),

  deleteInvoiceLine: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const line = await db.invoiceLine.findUnique({ where: { id: input.id } });

        // If the line doesn't exist, throw a NOT_FOUND error
        if (!line) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Line not found',
          });
        }
        await db.invoiceLine.delete({
          where: { id: input.id },
        });

        return { id: input.id };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete invoice line',
        });
      }
    }),
});
