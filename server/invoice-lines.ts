import { z } from 'zod';
import { protectedProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';
import { InvoiceLineCreateInputSchema, InvoiceUpdateInputSchema } from '@/prisma/generated/zod';

export const invoiceLinesRouter = t.router({
  createInvoiceLine: protectedProcedure
    .input(z.object({ data: InvoiceLineCreateInputSchema }))
    .mutation(async ({ input }) => {
      const { data } = input;
      try {
        return await db.$transaction(async (tx) => {
          let newLine = await tx.invoiceLine.create({
            data: data,
          });

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
        data: InvoiceUpdateInputSchema,
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const line = await db.invoiceLine.update({
          where: { id: input.id },
          data: input.data,
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
