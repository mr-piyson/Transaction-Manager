import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import db from '@/lib/db';
import { protectedProcedure, publicProcedure, t } from '@/lib/trpc/server';
import { InvoiceStatus, Prisma } from '@prisma/client';

export async function updateInvoiceStatus(
  invoiceId: number,
  tx: any,
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

// ✅ Moved OUTSIDE the router object
async function deductStockForInvoice(
  tx: Prisma.TransactionClient,
  invoice: any,
  lines: any[],
  ctx: any,
  sourceLabel: string,
) {
  for (const line of lines) {
    const itemId = line.itemId || line.inventoryItemId;
    if (!itemId) continue;

    const masterItem = await tx.item.findUnique({
      where: { id: itemId },
    });
  }
}

export const invoiceRouter = t.router({
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
            lines: input.invoiceLines || undefined,
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

  createInvoice: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.invoice.create({
          data: {
            organizationId: ctx.user.organizationId,
            customerId: input.customerId,
            createdBy: ctx.user.id,
          },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create invoice',
          cause: error,
        });
      }
    }),

  getInvoiceById: publicProcedure
    .input(
      z.object({
        id: z.string(),
        include: z
          .object({
            customer: z.boolean().optional(),
            // ✅ Renamed to match Prisma relation field name
            lines: z.boolean().optional(),
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
          // ✅ Fixed: z.nativeEnum for Prisma enums
          status: z.nativeEnum(InvoiceStatus).optional(),
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
            include: { lines: true },
          });

          if (!currentInvoice) throw new Error('Invoice not found');

          if (input.data.status === 'SENT' && currentInvoice.status !== 'SENT') {
            await deductStockForInvoice(
              tx,
              currentInvoice,
              currentInvoice.lines,
              ctx,
              'Invoice Update',
            );
          }

          return await tx.invoice.update({
            where: { id: input.id },
            data: { ...input.data },
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

  createFullInvoice: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        date: z.date().optional(),
        warehouseId: z.string().optional(),
        lines: z.array(
          z.object({
            id: z.string().optional(),
            parentId: z.string().optional(),
            isGroup: z.boolean().optional(),
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
          let subtotal = 0;
          for (const line of input.lines.filter((l) => !l.isGroup)) {
            subtotal += line.unitPrice * line.quantity;
          }
          const total = subtotal;

          const invoice = await tx.invoice.create({
            data: {
              organizationId: ctx.user.organizationId,
              userId: ctx.user.id,
              customerId: input.customerId,
              invoiceDate: input.date || new Date(),
              subtotal: BigInt(Math.round(subtotal)),
              taxTotal: BigInt(0),
              discountTotal: BigInt(0),
              total: BigInt(Math.round(total)),
              status: input.isCompleted ? 'SENT' : 'DRAFT',
            },
          });

          // Map to store temporary UI IDs to real DB IDs for groups
          const groupMap = new Map<string, string>();

          // First, create all groups
          const groupLines = input.lines.filter((l) => l.isGroup);
          for (const g of groupLines) {
            const group = await tx.invoiceLineGroup.create({
              data: {
                title: g.description,
                invoiceId: invoice.id,
              },
            });
            groupMap.set(g.id!, group.id);
          }

          const createdLines = [];
          const regularLines = input.lines.filter((l) => !l.isGroup);
          for (const line of regularLines) {
            const invoiceLine = await tx.invoiceLine.create({
              data: {
                invoiceId: invoice.id,
                itemId: line.itemId || line.inventoryItemId,
                description: line.description,
                quantity: BigInt(line.quantity),
                unitSalePrice: BigInt(Math.round(line.unitPrice)),
                lineTotal: BigInt(Math.round(line.unitPrice * line.quantity)),
                invoiceLineGroupId: line.parentId ? groupMap.get(line.parentId) : null,
              },
            });
            createdLines.push(invoiceLine);
          }

          if (input.isCompleted) {
            await deductStockForInvoice(tx, invoice, createdLines, ctx, 'New Invoice');
          }

          return invoice;
        });
      } catch (error) {
        console.error('[INVOICE_CREATE_ERROR]', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create full invoice',
          cause: error,
        });
      }
    }),
});
