import { ApiResponse } from '@/lib/server';
import db from '@/lib/db';
import { NextRequest } from 'next/server';

export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/invoice-lines/[id]'>) {
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

export async function DELETE(req: NextRequest, ctx: RouteContext<'/api/invoice-lines/[id]'>) {
  try {
    const id = Number((await ctx.params).id);
    const line = await db.invoiceLine.findUnique({ where: { id: id } });

    if (!line) {
      return ApiResponse.serverError('Line not found', 404);
    }
    if (line.isGroup) {
      await db.invoiceLine.deleteMany({
        where: { parentId: id },
      });
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

  // 1) Update group totals
  const groups = lines.filter((l) => l.isGroup);
  for (const group of groups) {
    const children = lines.filter((l) => l.parentId === group.id);
    const groupPurchase = children.reduce((acc, l) => acc + l.purchasePrice * l.quantity, 0);
    const groupSales = children.reduce((acc, l) => acc + l.salesPrice * l.quantity, 0);
    const groupTotal = children.reduce((acc, l) => acc + l.total, 0);
    await db.invoiceLine.update({
      where: { id: group.id },
      data: {
        purchasePrice: groupPurchase,
        salesPrice: groupSales,
        total: groupTotal,
      },
    });
  }

  // 2) Update Invoice Total (summing only non-group lines to avoid double-counting)
  const nonGroupLines = lines.filter((l) => !l.isGroup);
  const subtotal = nonGroupLines.reduce((acc, line) => acc + line.total, 0);

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
