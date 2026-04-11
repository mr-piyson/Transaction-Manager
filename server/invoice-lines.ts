import { z } from 'zod';
import { protectedProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';

export const invoiceLinesRouter = t.router({
  createInvoiceLine: protectedProcedure
    .input(
      z.object({
        invoiceId: z.number(),
        inventoryItemId: z.number().optional(),
        stockItemId: z.number().optional(),
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
            if (!inventoryItemId && !input.stockItemId) {
              throw new Error('Missing inventoryItemId or stockItemId');
            }

            let name = description || '';
            let purchasePrice = 0;
            let salesPrice = 0;
            let finalStockItemId = input.stockItemId;

            if (inventoryItemId) {
              const supplierItem = await tx.supplierItem.findUnique({
                where: { id: inventoryItemId },
                include: { stockItem: true },
              });
              if (!supplierItem) throw new Error('Supplier item not found');
              name = name || supplierItem.name;
              purchasePrice = supplierItem.basePrice;
              // If it's linked to a master item, use that for stock deduction later
              finalStockItemId = finalStockItemId || supplierItem.stockItemId || undefined;
              
              if (supplierItem.stockItem) {
                salesPrice = supplierItem.stockItem.salesPrice;
              } else {
                salesPrice = supplierItem.basePrice; // Fallback
              }
            } else if (input.stockItemId) {
              const masterItem = await tx.stockItem.findUnique({
                where: { id: input.stockItemId },
              });
              if (!masterItem) throw new Error('Master stock item not found');
              name = name || masterItem.name;
              purchasePrice = masterItem.purchasePrice;
              salesPrice = masterItem.salesPrice;
              finalStockItemId = masterItem.id;
            }

            const lineTotal = salesPrice * quantity;

            newLine = await tx.invoiceLine.create({
              data: {
                invoiceId,
                inventoryItemId,
                stockItemId: finalStockItemId,
                description: name,
                purchasePrice,
                salesPrice,
                quantity,
                total: lineTotal,
                parentId,
              },
            });

            if (parentId) {
              await tx.invoiceLine.update({
                where: { id: parentId },
                data: {
                  purchasePrice: { increment: purchasePrice * quantity },
                  salesPrice: { increment: salesPrice * quantity },
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

  updateInvoiceLine: protectedProcedure
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

  deleteInvoiceLine: protectedProcedure
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
