import { protectedProcedure, router } from '@/lib/trpc/server';
import { InvoiceStatus, PaymentStatus, PurchaseStatus } from '@prisma/client';
import { z } from 'zod';

export const purchaseRouter = router({
  // Create a new Purchase Order
  create: protectedProcedure
    .input(
      z.object({
        supplierId: z.string(),
        lines: z.array(
          z.object({
            stockItemId: z.string(),
            quantity: z.number(),
            purchasePrice: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.organizationId) throw new Error('Unauthorized: No organization');

      const total = input.lines.reduce((acc, line) => acc + line.purchasePrice * line.quantity, 0);

      return await ctx.db.purchaseOrder.create({
        data: {
          supplierId: input.supplierId,
          organizationId: ctx.user.organizationId,
          total,
        },
      });
    }),

  // Get list of Purchase Orders
  getPurchases: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await ctx.db.purchaseOrder.findMany({
        where: { organizationId: ctx.user.organizationId },
        include: {
          supplier: true,
          _count: { select: { lines: true } },
        },
        orderBy: { date: 'desc' },
      });
    } catch (error) {
      throw new Error('Failed to fetch purchase orders');
    }
  }),

  // Receive items and update Stock
  receiveOrder: protectedProcedure
    .input(
      z.object({
        purchaseOrderId: z.string(),
        warehouseId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        const po = await tx.purchaseOrder.findUnique({
          where: { id: input.purchaseOrderId },
          include: { lines: { include: { item: true } } },
        });

        if (!po || po.isReceived) throw new Error('Order not found or already received');

        // Increment stock for each PRODUCT in the PO
        for (const line of po.lines) {
          if (line.item.type === 'PRODUCT') {
            await tx.stock.upsert({
              where: {
                itemId_warehouseId: {
                  itemId: line.itemId,
                  warehouseId: input.warehouseId,
                },
              },
              update: { quantity: { increment: line.quantity } },
              create: {
                itemId: line.itemId,
                warehouseId: input.warehouseId,
                quantity: line.quantity,
                organizationId: po.organizationId,
              },
            });

            // Create StockMovement Log
            await tx.stockMovement.create({
              data: {
                type: 'PURCHASE_INBOUND',
                quantity: line.quantity,
                itemId: line.itemId,
                toWarehouseId: input.warehouseId,
                purchaseId: po.id,
                organizationId: po.organizationId,
                userId: ctx.user.id,
                notes: `Received from PO #${po.id}`,
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

  updateStatus: protectedProcedure
    .input(z.object({ id: z.string(), status: z.enum(PurchaseStatus) }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.purchaseOrder.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),
});
