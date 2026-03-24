import { ApiResponse } from '@/lib/server';
import db from '@/lib/database';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/customers/[id]'>) {
  try {
    const id = Number((await ctx.params).id);
    const items = await db.customer.findUnique({
      where: {
        id,
      },
    });
    return ApiResponse.success(items);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext<'/api/customers/[id]'>) {
  try {
    const id = Number((await ctx.params).id);
    const items = await db.customer.delete({
      where: {
        id,
      },
    });
    return ApiResponse.success(items);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}
