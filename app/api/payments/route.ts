import { ApiResponse } from '@/lib/server';
import db from '@/lib/database';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const created = await db.payment.create({
      data: {
        method: data.method,
        amount: data.amount,
        reference: data.reference,
        notes: data.notes,
        invoiceId: data.invoiceId,
        date: data.date ? new Date(data.date) : undefined,
      },
    });
    // check if invoice is status of the invoice

    // Also update invoice paymentStatus if needed
    const invoice = await db.invoice.findUnique({
      where: {
        id: data.invoiceId,
      },
    });
    if (invoice) {
      await db.invoice.update({
        where: {
          id: data.invoiceId,
        },
        data: {
          paymentStatus: invoice.paymentStatus === 'Paid' ? 'Partial' : 'Paid',
        },
      });
    }

    return ApiResponse.success(created);
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
