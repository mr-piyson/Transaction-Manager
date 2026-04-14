import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import db from '@/lib/db';
import { protectedProcedure, publicProcedure, t } from '@/lib/trpc/server';
import { InvoiceStatus, Prisma } from '@prisma/client';

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
        customerId: z.union([z.string()]),
        // You can add more schema fields here to validate the 'body'
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Because of authMiddleware, ctx.user is guaranteed to exist here
        const item = await db.invoice.create({
          data: {
            organizationId: ctx.user.organizationId,
            customerId: input.customerId,
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
        id: z.string(),
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
        id: z.string(),
        data: z.object({
          // Define the fields you want to allow updating
          status: z.enum(InvoiceStatus).optional(),
          amount: z.number().optional(),
          dueDate: z.date().optional(),
          customerId: z.string().optional(),
          warehouseId: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.$transaction(async (tx) => {
          const currentInvoice = await tx.invoice.findUnique({
            where: { id: input.id },
            include: { lines: { include: { item: true } } },
          });

          if (!currentInvoice) throw new Error('Invoice not found');

          // Trigger stock deduction if completing for the first time
          if (input.data.status === 'SENT' && currentInvoice.status !== 'SENT') {
            for (const line of currentInvoice.lines) {
              if (line.item?.type === 'PRODUCT' && currentInvoice.warehouseId) {
                await tx.stock.update({
                  where: { id: line.item.id },
                  data: { quantity: { decrement: Number(line.quantity) } },
                });

                await tx.stockMovement.create({
                  data: {
                    type: 'SALE_OUTBOUND',
                    quantity: -line.quantity,
                    itemId: line.item.id,
                    fromWarehouseId: currentInvoice.warehouseId,
                    invoiceId: currentInvoice.id,
                    organizationId: ctx.user.organizationId,
                    userId: ctx.user.id,
                    notes: `Sale from Invoice Update #${currentInvoice.id}`,
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
    .input(z.object({ id: z.string() }))
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
  /**
   * Create a full invoice with lines
   */
  createFullInvoice: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        date: z.date().optional(),
        warehouseId: z.string().optional(),
        lines: z.array(
          z.object({
            itemId: z.string().optional(),
            inventoryItemId: z.string().optional(),
            description: z.string(),
            quantity: z.number(),
            unitPrice: z.number(),
            purchasePrice: z.number(),
            tax: z.number().optional().default(0),
          }),
        ),
        isCompleted: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.$transaction(async (tx) => {
          // 1. Calculate totals
          let subtotal = 0;
          for (const line of input.lines) {
            subtotal += line.unitPrice * line.quantity;
          }
          const total = subtotal;

          // 2. Create invoice
          const invoice = await tx.invoice.create({
            data: {
              organizationId: ctx.user.organizationId,
              userId: ctx.user.id,
              customerId: input.customerId,
              date: input.date || new Date(),
              warehouseId: input.warehouseId,
              subtotal,
              total,
              isCompleted: input.isCompleted,
            },
          });

          // 3. Create lines
          for (const line of input.lines) {
            await tx.invoiceLine.create({
              data: {
                invoiceId: invoice.id,
                ItemId: line.itemId,
                inventoryItemId: line.inventoryItemId as any, // if this field exists in your extended schema, otherwise it might fail. Let's assume ItemId is the main one.
                description: line.description,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                purchasePrice: line.purchasePrice,
                total: line.unitPrice * line.quantity,
              },
            });

            // 4. Stock management if completed
            if (input.isCompleted && line.itemId && (input.warehouseId || invoice.warehouseId)) {
              const warehouseId = input.warehouseId || invoice.warehouseId;
              const masterItem = await tx.item.findUnique({
                where: { id: line.itemId },
              });

              if (masterItem?.type === 'PRODUCT' && warehouseId) {
                await tx.stock.upsert({
                  where: {
                    itemId_warehouseId: {
                      itemId: line.itemId,
                      warehouseId: warehouseId,
                    },
                  },
                  update: { quantity: { decrement: line.quantity } },
                  create: {
                    itemId: line.itemId,
                    warehouseId: warehouseId,
                    quantity: -line.quantity,
                    organizationId: ctx.user.organizationId,
                  },
                });

                await tx.stockMovement.create({
                  data: {
                    type: 'SALE_OUTBOUND',
                    quantity: -line.quantity,
                    itemId: line.itemId,
                    fromWarehouseId: warehouseId,
                    invoiceId: invoice.id,
                    organizationId: ctx.user.organizationId,
                    userId: ctx.user.id,
                    notes: `Sale from New Invoice #${invoice.id}`,
                  },
                });
              }
            }
          }

          return invoice;
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create full invoice',
          cause: error,
        });
      }
    }),
});
