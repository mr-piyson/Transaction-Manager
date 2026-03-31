import { ApiResponse } from '@/lib/server';
import db from '@/lib/database';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/invoices/[id]'>) {
  try {
    const id = Number((await ctx.params).id);

    const searchParams = req.nextUrl.searchParams;
    const includeParam = searchParams.get('include');

    const include: Prisma.InvoiceInclude | undefined = includeParam
      ? JSON.parse(includeParam)
      : undefined;

    const item = await db.invoice.findUnique({
      where: { id },
      include,
    });

    return ApiResponse.success(item);
  } catch (error) {
    console.error(error);
    return ApiResponse.serverError(error);
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext<'/api/invoices/[id]'>) {
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

export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/invoices/[id]'>) {
  try {
    const id = Number((await ctx.params).id);
    const body = await req.json();
    const items = await db.invoice.update({
      where: {
        id,
      },
      data: body,
    });
    return ApiResponse.success(items);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}
