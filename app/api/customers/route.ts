import { ApiResponse } from '@/lib/server';
import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/customers'>) {
  try {
    // GET logic here
    const items = await db.customer.findMany({});
    return ApiResponse.success(items);
  } catch (error) {
    return ApiResponse.serverError();
  }
}

export async function POST(req: NextRequest, ctx: RouteContext<'/api/customers'>) {
  try {
    const user = await getCurrentUser();
    if (!user) return ApiResponse.unauthorized();
    const body = await req.json();
    const items = await db.customer.create({
      data: {
        ...body,
        organizationId: user.organizationId,
      },
    });
    return ApiResponse.success(items);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}
