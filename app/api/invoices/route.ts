import { ApiResponse } from '@/lib/server';
import db from '@/lib/database';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/invoices'>) {
  try {
    // GET logic here
    const items = await db.invoice.findMany({});
    return ApiResponse.success(items);
  } catch (error) {
    return ApiResponse.serverError();
  }
}

export async function POST(req: NextRequest, ctx: RouteContext<'/api/invoices'>) {
  try {
    const user = await getCurrentUser();
    if (!user) return ApiResponse.unauthorized();

    const body = await req.json();
    const items = await db.invoice.create({
      data: {
        organizationId: user.organizationId,
        customerId: Number(body.customerId),
        userId: user.id,
        // ...body,
      },
    });
    return ApiResponse.success(items);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}
