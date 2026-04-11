import { protectedProcedure, router } from '@/lib/trpc/server';
import z from 'zod';

export const invoiceRouter = router({
  createInvoice: protectedProcedure
    .input(
      z.object({
        customerId: z.number(),
        organizationId: z.number(),
        warehouseId: z.number().optional(), // Required if selling products
        items: z.array(
          z.object({
            stockItemId: z.number(),
            quantity: z.number(),
            salesPrice: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // 1. Calculate totals
        const subtotal = input.items.reduce(
          (acc, item) => acc + item.salesPrice * item.quantity,
          0,
        );

        // 2. Create the Invoice [cite: 20]
        const invoice = await tx.invoice.create({
          data: {
            customerId: input.customerId,
            organizationId: input.organizationId,
            userId: ctx.user.id,
            subtotal,
            total: subtotal, // Simplified for this example
            invoiceLines: {
              create: input.items.map((item) => ({
                inventoryItemId: item.stockItemId,
                quantity: item.quantity,
                salesPrice: item.salesPrice,
                purchasePrice: 0, // In AR, we track sales price [cite: 24]
                total: item.salesPrice * item.quantity,
              })),
            },
          },
        });

        // 3. Stock Outbound Logic
        for (const item of input.items) {
          const stockItem = await tx.stockItem.findUnique({ where: { id: item.stockItemId } });

          if (stockItem?.type === 'PRODUCT' && input.warehouseId) {
            // Deduct from stock [cite: 48, 49]
            await tx.stock.update({
              where: {
                stockItemId_warehouseId: {
                  stockItemId: item.stockItemId,
                  warehouseId: input.warehouseId,
                },
              },
              data: { quantity: { decrement: item.quantity } },
            });
          }
          // If SERVICE, we simply record the revenue without touching Stock
        }

        return invoice;
      });
    }),
});
