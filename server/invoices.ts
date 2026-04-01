import db from '@/lib/db';

// export async function updateInvoiceStatus(id: number) {
//   // Wrap in a transaction to ensure we have a consistent snapshot
//   return await db.$transaction(async (tx) => {
//     const invoice = await tx.invoice.findUnique({
//       where: { id },
//       include: { payments: true, invoiceLines: true },
//     });

//     if (!invoice) return;

//     const totalAmount = invoice.invoiceLines.reduce((acc, line) => acc + line.total, 0);
//     const totalPaid = invoice.payments.reduce((acc, payment) => acc + payment.amount, 0);

//     let status: 'Paid' | 'Partial' | 'Unpaid' = 'Unpaid';
//     if (totalPaid >= totalAmount && totalAmount > 0) status = 'Paid';
//     else if (totalPaid > 0) status = 'Partial';

//     return await tx.invoice.update({
//       where: { id },
//       data: { paymentStatus: status },
//     });
//   });
// }

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
