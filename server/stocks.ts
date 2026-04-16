import db from '@/lib/db';
import { protectedProcedure, router } from '@/lib/trpc/server';
import { StockMovementType } from '@prisma/client';
import z from 'zod';

export const stockRouter = router({
  getStocks: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.stock.findMany({
        where: { organizationId: ctx.user.organizationId },
        include: {
          item: true,
          warehouse: true,
        },
      });
    } catch (error) {
      throw new Error('Failed to fetch stock levels');
    }
  }),

  getItemStockDetails: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const item = await db.item.findUnique({
          where: { id: input.itemId },
          include: {
            stockEntries: {
              include: { warehouse: true },
            },
            stockMovements: {
              include: { 
                user: true,
                fromWarehouse: true,
                toWarehouse: true
              },
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        });

        if (!item || item.organizationId !== ctx.user.organizationId) {
          throw new Error('Item not found');
        }

        return item;
      } catch (error) {
        throw new Error('Failed to fetch item stock details');
      }
    }),

  getStockMovements: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.stockMovement.findMany({
        where: { organizationId: ctx.user.organizationId },
        include: {
          item: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new Error('Failed to fetch stock movements');
    }
  }),

  adjustStock: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        warehouseId: z.string(),
        quantity: z.number(), // Offset (+/-)
        type: z.enum(StockMovementType),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        const stock = await tx.stock.upsert({
          where: {
            itemId_warehouseId: {
              itemId: input.itemId,
              warehouseId: input.warehouseId,
            },
          },
          update: { quantity: { increment: input.quantity } },
          create: {
            itemId: input.itemId,
            warehouseId: input.warehouseId,
            quantity: input.quantity,
            organizationId: ctx.user.organizationId,
          },
        });

        await tx.stockMovement.create({
          data: {
            type: input.type,
            quantity: input.quantity,
            itemId: input.itemId,
            toWarehouseId: input.quantity > 0 ? input.warehouseId : null,
            fromWarehouseId: input.quantity < 0 ? input.warehouseId : null,
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            notes: input.notes || `Manual ${input.type}`,
          },
        });

        return stock;
      });
    }),

  transfer: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        fromWarehouseId: z.string(),
        toWarehouseId: z.string(),
        quantity: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // 1. Check source stock
        const source = await tx.stock.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: input.itemId,
              warehouseId: input.fromWarehouseId,
            },
          },
        });

        if (!source || source.quantity < input.quantity) {
          throw new Error('Insufficient stock in source warehouse');
        }

        // 2. Deduct from source
        await tx.stock.update({
          where: { id: source.id },
          data: { quantity: { decrement: input.quantity } },
        });

        // 3. Add to destination
        await tx.stock.upsert({
          where: {
            itemId_warehouseId: {
              itemId: input.itemId,
              warehouseId: input.toWarehouseId,
            },
          },
          update: { quantity: { increment: input.quantity } },
          create: {
            itemId: input.itemId,
            warehouseId: input.toWarehouseId,
            quantity: input.quantity,
            organizationId: ctx.user.organizationId,
          },
        });

        // 4. Create Audit Log
        return await tx.stockMovement.create({
          data: {
            type: 'TRANSFER',
            quantity: input.quantity,
            itemId: input.itemId,
            fromWarehouseId: input.fromWarehouseId,
            toWarehouseId: input.toWarehouseId,
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            notes: `Transfer from WH ${input.fromWarehouseId} to WH ${input.toWarehouseId}`,
          },
        });
      });
    }),
});
