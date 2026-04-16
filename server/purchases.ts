import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '@/lib/trpc/server';
import { InvoiceStatus, PaymentStatus, PurchaseStatus } from '@prisma/client';
import { z } from 'zod';

export const purchaseRouter = router({
  // Create a full Purchase Order with lines
  createFullPurchase: protectedProcedure
    .input(
      z.object({
        supplierId: z.string(),
        isReceived: z.boolean().default(false),
        warehouseId: z.string().optional(),
        lines: z.array(
          z.object({
            itemId: z.string(),
            quantity: z.number(),
            unitCost: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.$transaction(async (tx) => {
          // 1. Calculate total
          let subtotal = 0;
          for (const line of input.lines) {
            subtotal += line.unitCost * line.quantity;
          }
          const total = subtotal;

          // 2. Create purchase order
          const po = await tx.purchaseOrder.create({
            data: {
              organizationId: ctx.user.organizationId,
              supplierId: input.supplierId,
              subtotal: BigInt(subtotal),
              total: BigInt(total),
              status: input.isReceived ? 'RECEIVED' : 'DRAFT',
              isReceived: input.isReceived,
              receivedAt: input.isReceived ? new Date() : null,
            },
          });

          // 3. Create lines
          for (const line of input.lines) {
            const pl = await tx.purchaseLine.create({
              data: {
                purchaseOrderId: po.id,
                itemId: line.itemId,
                quantity: line.quantity,
                unitCost: BigInt(line.unitCost),
                total: BigInt(line.unitCost * line.quantity),
              },
            });

            // 4. Update stock if received
            if (input.isReceived && input.warehouseId) {
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
                  organizationId: ctx.user.organizationId,
                },
              });

              await tx.stockMovement.create({
                data: {
                  type: 'PURCHASE_INBOUND',
                  quantity: line.quantity,
                  itemId: line.itemId,
                  toWarehouseId: input.warehouseId,
                  purchaseLineId: pl.id,
                  organizationId: ctx.user.organizationId,
                  userId: ctx.user.id,
                  notes: `Received from Purchase #${po.id}`,
                },
              });
            }
          }

          return po;
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create purchase',
          cause: error,
        });
      }
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
