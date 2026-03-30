import { ApiResponse } from '@/lib/server';
import db from '@/lib/database';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // 1. Create the new payment
    const createdPayment = await db.payment.create({
      data: {
        method: data.method,
        amount: data.amount,
        reference: data.reference,
        notes: data.notes,
        invoiceId: data.invoiceId,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });

    // 2. Get the invoice and all its payments to calculate status
    const invoice = await db.invoice.findUnique({
      where: { id: data.invoiceId },
      include: {
        payments: true, // Ensure relation is defined in your schema
      },
    });

    if (invoice) {
      // Calculate total paid so far
      const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);

      let newStatus: 'Unpaid' | 'Partial' | 'Paid';

      if (totalPaid >= invoice.total) {
        newStatus = 'Paid';
      } else if (totalPaid > 0) {
        newStatus = 'Partial';
      } else {
        newStatus = 'Unpaid';
      }

      // 3. Update the invoice status
      await db.invoice.update({
        where: { id: data.invoiceId },
        data: { paymentStatus: newStatus },
      });
    }

    return ApiResponse.success(createdPayment);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const items = await db.payment.findMany();
    return ApiResponse.success(items);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}
