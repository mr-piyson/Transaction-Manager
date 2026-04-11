import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import db from '@/lib/db';
import { protectedProcedure, publicProcedure, t } from '@/lib/trpc/server';

// A reusable, high-performance version of your logic
export async function updateInvoiceStatus(
  invoiceId: number,
  tx: any, // Accepts the Prisma transaction client
  totalPaid: number,
  invoiceTotal: number,
) {
  let newStatus: 'Unpaid' | 'Partial' | 'Paid' = 'Unpaid';

  if (totalPaid >= invoiceTotal && invoiceTotal > 0) newStatus = 'Paid';
  else if (totalPaid > 0) newStatus = 'Partial';

  return await tx.invoice.update({
    where: { id: invoiceId },
    data: { paymentStatus: newStatus },
  });
}

// 4. The Router
export const invoiceRouter = t.router({
  /**
   * Get all invoices
   */
  getInvoices: protectedProcedure
    .input(
      z.object({
        customer: z.boolean().optional(),
        invoiceLines: z.boolean().optional(),
        payments: z.boolean().optional(),
      }),
    )
    .query(async ({ input }) => {
      try {
        return await db.invoice.findMany({
          include: {
            customer: input.customer || undefined,
            invoiceLines: input.invoiceLines || undefined,
            payments: input.payments || undefined,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database fetch failed',
        });
      }
    }),

  /**
   * Create invoice
   */
  createInvoice: protectedProcedure
    .input(
      z.object({
        customerId: z.union([z.string(), z.number()]),
        // You can add more schema fields here to validate the 'body'
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Because of authMiddleware, ctx.user is guaranteed to exist here
        const item = await db.invoice.create({
          data: {
            organizationId: ctx.user.organizationId,
            customerId: Number(input.customerId),
            userId: ctx.user.id,
          },
        });
        return item;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create invoice',
          cause: error,
        });
      }
    }),
  /**
   * Get invoice by id
   */
  getInvoiceById: publicProcedure
    .input(
      z.object({
        id: z.number(),
        // Instead of raw JSON.parse, we define expected relations
        include: z
          .object({
            customer: z.boolean().optional(),
            invoiceLines: z.boolean().optional(),
            payments: z.boolean().optional(),
          })
          .optional(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const item = await db.invoice.findUnique({
          where: { id: input.id },
          include: input.include,
        });

        if (!item) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Invoice not found',
          });
        }

        return item;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch invoice',
        });
      }
    }),

  updateInvoice: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          // Define the fields you want to allow updating
          status: z.string().optional(),
          amount: z.number().optional(),
          dueDate: z.date().optional(),
          isCompleted: z.boolean().optional(),
          customerId: z.number().optional(),
          warehouseId: z.number().optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.$transaction(async (tx) => {
          const currentInvoice = await tx.invoice.findUnique({
            where: { id: input.id },
            include: { invoiceLines: { include: { stockItem: true } } },
          });

          if (!currentInvoice) throw new Error('Invoice not found');

          // Trigger stock deduction if completing for the first time
          if (input.data.isCompleted === true && !currentInvoice.isCompleted) {
            const warehouseId = input.data.warehouseId || currentInvoice.warehouseId;
            if (!warehouseId) {
              // Only strictly require warehouse if there are PRODUCT lines
              const hasProducts = currentInvoice.invoiceLines.some((l) => l.stockItem?.type === 'PRODUCT');
              if (hasProducts) {
                throw new TRPCError({
                  code: 'BAD_REQUEST',
                  message: 'A warehouse must be selected to complete an invoice containing products.',
                });
              }
            }

            for (const line of currentInvoice.invoiceLines) {
              if (line.stockItem?.type === 'PRODUCT' && warehouseId) {
                // Deduct from stock
                await tx.stock.upsert({
                  where: {
                    stockItemId_warehouseId: {
                      stockItemId: line.stockItemId as number,
                      warehouseId: warehouseId,
                    },
                  },
                  update: { quantity: { decrement: line.quantity } },
                  create: {
                    stockItemId: line.stockItemId as number,
                    warehouseId: warehouseId,
                    quantity: -line.quantity,
                    organizationId: currentInvoice.organizationId,
                  },
                });

                // Audit Log
                await tx.stockMovement.create({
                  data: {
                    type: 'OUTBOUND',
                    quantity: -line.quantity,
                    stockItemId: line.stockItemId as number,
                    fromWarehouseId: warehouseId,
                    invoiceId: currentInvoice.id,
                    organizationId: currentInvoice.organizationId as number,
                    userId: ctx.user.id,
                    notes: `Sale from Invoice #${currentInvoice.id}`,
                  },
                });
              }
            }
          }

          return await tx.invoice.update({
            where: { id: input.id },
            data: input.data,
          });
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update invoice',
          cause: error,
        });
      }
    }),
  /**
   * Delete invoice by id
   */
  deleteInvoice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        return await db.invoice.delete({
          where: { id: input.id },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete invoice',
        });
      }
    }),
});
