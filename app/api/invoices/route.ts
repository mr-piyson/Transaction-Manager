import { ApiResponse } from '@/lib/server';
import db from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/invoices'>) {
  try {
    // Get search params
    const searchParams = req.nextUrl.searchParams;
    const customer = searchParams.get('customer') === 'true';
    const invoiceLines = searchParams.get('invoiceLines') === 'true';
    const payments = searchParams.get('payments') === 'true';
    // GET logic here
    const items = await db.invoice.findMany({
      include: {
        customer: customer || undefined,
        invoiceLines: invoiceLines || undefined,
        payments: payments || undefined,
      },
    });
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
