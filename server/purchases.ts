import { protectedProcedure, router } from '@/lib/trpc/server';
import { z } from 'zod';

export const purchaseRouter = router({
  // Create a new Purchase Order
  create: protectedProcedure
    .input(
      z.object({
        supplierId: z.number(),
        organizationId: z.number(),
        lines: z.array(
          z.object({
            stockItemId: z.number(),
            quantity: z.number(),
            purchasePrice: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const total = input.lines.reduce((acc, line) => acc + line.purchasePrice * line.quantity, 0);

      return await ctx.db.purchaseOrder.create({
        data: {
          supplierId: input.supplierId,
          organizationId: input.organizationId,
          total,
          lines: {
            create: input.lines.map((line) => ({
              stockItemId: line.stockItemId,
              quantity: line.quantity,
              purchasePrice: line.purchasePrice,
              total: line.purchasePrice * line.quantity,
            })),
          },
        },
      });
    }),

  // Receive items and update Stock
  receiveOrder: protectedProcedure
    .input(
      z.object({
        purchaseOrderId: z.number(),
        warehouseId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        const po = await tx.purchaseOrder.findUnique({
          where: { id: input.purchaseOrderId },
          include: { lines: { include: { stockItem: true } } },
        });

        if (!po || po.isReceived) throw new Error('Order not found or already received');

        // Increment stock for each PRODUCT in the PO
        for (const line of po.lines) {
          if (line.stockItem.type === 'PRODUCT') {
            await tx.stock.upsert({
              where: {
                stockItemId_warehouseId: {
                  stockItemId: line.stockItemId,
                  warehouseId: input.warehouseId,
                },
              },
              update: { quantity: { increment: line.quantity } },
              create: {
                stockItemId: line.stockItemId,
                warehouseId: input.warehouseId,
                quantity: line.quantity,
                organizationId: po.organizationId,
              },
            });
          }
        }

        return await tx.purchaseOrder.update({
          where: { id: input.purchaseOrderId },
          data: { isReceived: true },
        });
      });
    }),
});
