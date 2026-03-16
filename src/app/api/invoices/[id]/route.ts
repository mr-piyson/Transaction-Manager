import { ApiResponse } from '@/lib/api';
import db from '@/lib/database';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/invoices/[id]'>) {
  try {
    const id = Number((await ctx.params).id);
    const items = await db.invoice.findUnique({
      where: {
        id,
      },
    });
    return ApiResponse.success(items);
  } catch (error) {
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
