import { protectedProcedure, router } from '@/lib/trpc/server';
import z from 'zod';

export const stockRouter = router({
  transfer: protectedProcedure
    .input(
      z.object({
        stockItemId: z.number(),
        fromWarehouseId: z.number(),
        toWarehouseId: z.number(),
        quantity: z.number().positive(),
        organizationId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // 1. Check source stock
        const source = await tx.stock.findUnique({
          where: {
            stockItemId_warehouseId: {
              stockItemId: input.stockItemId,
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
            stockItemId_warehouseId: {
              stockItemId: input.stockItemId,
              warehouseId: input.toWarehouseId,
            },
          },
          update: { quantity: { increment: input.quantity } },
          create: {
            stockItemId: input.stockItemId,
            warehouseId: input.toWarehouseId,
            quantity: input.quantity,
            organizationId: input.organizationId,
          },
        });

        // 4. Create Audit Log
        return await tx.stockMovement.create({
          data: {
            type: 'TRANSFER',
            quantity: input.quantity,
            stockItemId: input.stockItemId,
            fromWarehouseId: input.fromWarehouseId,
            toWarehouseId: input.toWarehouseId,
            organizationId: input.organizationId,
            userId: ctx.user.id,
            notes: `Transfer from WH ${input.fromWarehouseId} to WH ${input.toWarehouseId}`,
          },
        });
      });
    }),
});
