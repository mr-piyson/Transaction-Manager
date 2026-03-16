import { ApiResponse } from '@/lib/api';
import db from '@/lib/database';
import { NextRequest, NextResponse } from 'next/server';

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
    const body = await req.json();
    const items = await db.invoice.create({ data: body });
    return ApiResponse.success(items);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}
