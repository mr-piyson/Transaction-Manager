import { ApiResponse } from '@/lib/server';
import db from '@/lib/database';
import { NextRequest } from 'next/server';
import { updateInvoiceStatus } from '@/server/invoices';

export async function POST(req: NextRequest) {
  return await db.$transaction(async (tx) => {
    const data = await req.json();

    // 1. Create payment
    const newPayment = await tx.payment.create({ data: { ...data } });

    // 2. Optimized calculation (The performance part)
    const [invoice, agg] = await Promise.all([
      tx.invoice.findUnique({ where: { id: data.invoiceId }, select: { total: true } }),
      tx.payment.aggregate({
        where: { invoiceId: data.invoiceId },
        _sum: { amount: true },
      }),
    ]);

    const totalPaid = agg._sum.amount || 0;

    // 3. Call the helper (The clean code part)
    // No extra DB fetches happen inside here now!
    if (!invoice) return ApiResponse.notFound();
    await updateInvoiceStatus(data.invoiceId, tx, totalPaid, invoice.total);

    return ApiResponse.success(newPayment);
  });
}

export async function GET(req: NextRequest) {
  try {
    const items = await db.payment.findMany();
    return ApiResponse.success(items);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}
