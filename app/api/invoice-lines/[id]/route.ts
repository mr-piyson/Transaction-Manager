import { ApiResponse } from '@/lib/server';
import db from '@/lib/database';
import { NextRequest } from 'next/server';

export async function PATCH(req: NextRequest, ctx: any) {
  try {
    const id = Number((await ctx.params).id);
    const body = await req.json();

    const line = await db.invoiceLine.update({
      where: { id },
      data: body,
      include: {
        itemRef: true,
      },
    });

    if (line.invoiceId) {
      await updateInvoiceTotals(line.invoiceId);
    }

    return ApiResponse.success(line);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

export async function DELETE(req: NextRequest, ctx: any) {
  try {
    const id = Number((await ctx.params).id);
    const line = await db.invoiceLine.findUnique({ where: { id } });

    if (!line) {
      return ApiResponse.serverError('Line not found', 404);
    }

    await db.invoiceLine.delete({
      where: { id },
    });

    if (line.invoiceId) {
      await updateInvoiceTotals(line.invoiceId);
    }

    return ApiResponse.success({ id });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

async function updateInvoiceTotals(invoiceId: number) {
  const lines = await db.invoiceLine.findMany({
    where: { invoiceId },
  });

  const subtotal = lines.reduce((acc, line) => acc + line.total, 0);
  // For now, let's assume discountTotal and taxTotal are 0 or handled elsewhere
  const total = subtotal;

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal,
      total,
    },
  });
}
