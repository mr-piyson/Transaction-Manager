import { ApiResponse } from '@/lib/api';
import db from '@/lib/database';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

// 1. Define the selection/inclusion criteria
export const invoiceWithDetails = Prisma.validator<Prisma.InvoiceDefaultArgs>()(
  {
    include: {
      customer: true,
      invoiceItems: true,
      payments: true,
    },
  },
);

// 2. Export the Type based on that criteria
export type InvoiceWithDetails = Prisma.InvoiceGetPayload<
  typeof invoiceWithDetails
>;

export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/api/invoices/[id]'>,
) {
  try {
    const id = Number((await ctx.params).id);
    const items = await db.invoice.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
        invoiceItems: true,
        payments: true,
      },
    });
    return ApiResponse.success(items);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<'/api/invoices/[id]'>,
) {
  try {
    const id = Number((await ctx.params).id);
    const items = await db.invoice.delete({
      where: {
        id,
      },
    });
    return ApiResponse.success(items);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}
