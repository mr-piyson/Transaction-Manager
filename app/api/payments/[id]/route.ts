import { ApiResponse } from '@/lib/server';
import db from '@/lib/db';
import { NextRequest } from 'next/server';
import { updateInvoiceStatus } from '@/lib/trpc/routers/invoices';

export async function DELETE(req: NextRequest, ctx: RouteContext<'/api/payments/[id]'>) {
  try {
    const id = Number((await ctx.params).id);

    const result = await db.$transaction(async (tx) => {
      // 1. Delete the payment and get the invoiceId it belonged to
      const deletedPayment = await tx.payment.delete({
        where: { id },
        select: { invoiceId: true }, // Only select what we need
      });

      const invoiceId = deletedPayment.invoiceId;

      // 2. Aggregate remaining payments and get Invoice total
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

      // 3. Determine new status
      let newStatus: 'Unpaid' | 'Partial' | 'Paid' = 'Unpaid';
      if (totalRemainingPaid >= invoiceTotal && invoiceTotal > 0) {
        newStatus = 'Paid';
      } else if (totalRemainingPaid > 0) {
        newStatus = 'Partial';
      }

      // 4. Update the invoice status
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { paymentStatus: newStatus },
      });

      return deletedPayment;
    });

    return ApiResponse.success(result);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}
