import { z } from 'zod';
import { protactedProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';

export const invoiceLinesRouter = t.router({
  createInvoiceLine: protactedProcedure
    .input(
      z.object({
        invoiceId: z.number(),
        inventoryItemId: z.number().optional(),
        quantity: z.number().optional().default(1),
        isGroup: z.boolean().optional(),
        parentId: z.number().optional(),
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
            if (!inventoryItemId) throw new Error('Missing inventoryItemId');
            const [item, parentGroup] = await Promise.all([
              tx.inventoryItem.findUnique({ where: { id: inventoryItemId } }),
              parentId
                ? tx.invoiceLine.findUnique({ where: { id: parentId } })
                : Promise.resolve(null),
            ]);

            if (!item) throw new Error('Inventory item not found');

            const lineTotal = item.salesPrice * quantity;

            newLine = await tx.invoiceLine.create({
              data: {
                invoiceId,
                inventoryItemId,
                description: item.name,
                purchasePrice: item.purchasePrice,
                salesPrice: item.salesPrice,
                quantity,
                total: lineTotal,
                parentId,
              },
            });

            if (parentId) {
              await tx.invoiceLine.update({
                where: { id: parentId },
                data: {
                  purchasePrice: { increment: item.purchasePrice * quantity },
                  salesPrice: { increment: item.salesPrice * quantity },
                  total: { increment: lineTotal },
                },
              });
            }

            await tx.invoice.update({
              where: { id: invoiceId },
              data: {
                subtotal: { increment: lineTotal },
                total: { increment: lineTotal },
              },
            });
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

  updateInvoiceLine: protactedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.any(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const line = await db.invoiceLine.update({
          where: { id: input.id },
          data: input.data,
          include: {
            itemRef: true,
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

  deleteInvoiceLine: protactedProcedure
    .input(z.object({ id: z.number() }))
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

async function updateInvoiceTotals(invoiceId: number) {
  const lines = await db.invoiceLine.findMany({
    where: { invoiceId },
  });

  const groups = lines.filter((l) => l.isGroup);
  for (const group of groups) {
    const children = lines.filter((l) => l.parentId === group.id);
    const groupPurchase = children.reduce((acc, l) => acc + l.purchasePrice * l.quantity, 0);
    const groupSales = children.reduce((acc, l) => acc + l.salesPrice * l.quantity, 0);
    const groupTotal = children.reduce((acc, l) => acc + l.total, 0);
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
  const subtotal = nonGroupLines.reduce((acc, line) => acc + line.total, 0);
  const total = subtotal;

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal,
      total,
    },
  });
}
