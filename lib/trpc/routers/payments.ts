import { z } from 'zod';
import { authed, base, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';
import { updateInvoiceStatus } from '@/lib/trpc/routers/invoices';

export const paymentRouter = t.router({
  getPayments: authed.query(async () => {
    try {
      return await db.payment.findMany();
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch payments',
      });
    }
  }),

  createPayment: authed.input(z.any()).mutation(async ({ input }) => {
    try {
      return await db.$transaction(async (tx) => {
        const newPayment = await tx.payment.create({ data: { ...input } });

        const [invoice, agg] = await Promise.all([
          tx.invoice.findUnique({ where: { id: input.invoiceId }, select: { total: true } }),
          tx.payment.aggregate({
            where: { invoiceId: input.invoiceId },
            _sum: { amount: true },
          }),
        ]);

        const totalPaid = agg._sum.amount || 0;

        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Invoice not found',
          });
        }
        await updateInvoiceStatus(input.invoiceId, tx, totalPaid, invoice.total);

        return newPayment;
      });
    } catch (error: any) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to create payment',
      });
    }
  }),

  deletePayment: authed.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    try {
      return await db.$transaction(async (tx) => {
        const deletedPayment = await tx.payment.delete({
          where: { id: input.id },
          select: { invoiceId: true },
        });

        const invoiceId = deletedPayment.invoiceId;

        const [invoiceData, aggregation] = await Promise.all([
          tx.invoice.findUnique({
            where: { id: invoiceId },
            select: { total: true },
          }),
          tx.payment.aggregate({
            where: { invoiceId },
            _sum: { amount: true },
          }),
        ]);

        if (!invoiceData) throw new Error('Invoice not found');

        const totalRemainingPaid = aggregation._sum.amount || 0;
        const invoiceTotal = invoiceData.total;

        let newStatus: 'Unpaid' | 'Partial' | 'Paid' = 'Unpaid';
        if (totalRemainingPaid >= invoiceTotal && invoiceTotal > 0) {
          newStatus = 'Paid';
        } else if (totalRemainingPaid > 0) {
          newStatus = 'Partial';
        }

        await tx.invoice.update({
          where: { id: invoiceId },
          data: { paymentStatus: newStatus },
        });

        return deletedPayment;
      });
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to delete payment',
      });
    }
  }),
});
