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

  /**
   * Update invoice by id
   */
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
        }),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        console.log(input);
        return await db.invoice.update({
          where: { id: input.id },
          data: input.data,
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update invoice',
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
