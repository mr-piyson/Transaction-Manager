import { z } from 'zod';
import { protectedProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';
import { InvoiceUpdateInputSchema } from '@/prisma/generated/zod';

export const invoiceLinesRouter = t.router({
  createInvoiceLine: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        inventoryItemId: z.string().optional(),
        stockItemId: z.string().optional(),
        quantity: z.number().optional().default(1),
        isGroup: z.boolean().optional(),
        parentId: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { invoiceId, inventoryItemId, quantity, isGroup, parentId, description } = input;

      try {
        return await db.$transaction(async (tx) => {
          let newLine;

          if (isGroup) {
            newLine = await tx.invoiceLine.create({
              data: {
                invoiceId,
                description: description || 'Group',
                isGroup: true,
                purchasePrice: 0,
                salesPrice: 0,
                quantity: 1,
                total: 0,
              },
            });
          } else {
            if (!inventoryItemId && !input.stockItemId) {
              throw new Error('Missing inventoryItemId or stockItemId');
            }
          }

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

        if (line.invoiceId) {
          await updateInvoiceTotals(line.invoiceId);
        }

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

        if (!line) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Line not found',
          });
        }
        if (line.isGroup) {
          await db.invoiceLine.deleteMany({
            where: { parentId: input.id },
          });
        }
        await db.invoiceLine.delete({
          where: { id: input.id },
        });

        if (line.invoiceId) {
          await updateInvoiceTotals(line.invoiceId);
        }

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

async function updateInvoiceTotals(invoiceId: string) {
  const lines = await db.invoiceLine.findMany({
    where: { invoiceId },
  });

  const groups = lines.filter((l) => l.isGroup);
  for (const group of groups) {
    const children = lines.filter((l) => l.parentId === group.id);
    const groupPurchase = children.reduce(
      (acc, l) => BigInt(acc) + BigInt(l.purchasePrice) * BigInt(l.quantity),
      BigInt(0),
    );
    const groupSales = children.reduce(
      (acc, l) => acc + BigInt(l.salesPrice) * BigInt(l.quantity),
      BigInt(0),
    );
    const groupTotal = children.reduce((acc, l) => acc + BigInt(l.total), BigInt(0));
    await db.invoiceLine.update({
      where: { id: group.id },
      data: {
        purchasePrice: groupPurchase,
        salesPrice: groupSales,
        total: groupTotal,
      },
    });
  }

  const nonGroupLines = lines.filter((l) => !l.isGroup);
  const subtotal = nonGroupLines.reduce((acc, line) => BigInt(acc) + BigInt(line.total), BigInt(0));
  const total = subtotal;

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal,
      total,
    },
  });
}
