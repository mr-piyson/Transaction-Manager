import { ApiResponse } from '@/lib/server';
import db from '@/lib/database';
import { NextRequest } from 'next/server';

export async function DELETE(req: NextRequest, ctx: RouteContext<'/api/payments/[id]'>) {
  try {
    const id = Number((await ctx.params).id);
    const item = await db.payment.delete({
      where: {
        id,
      },
    });
    return ApiResponse.success(item);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}
