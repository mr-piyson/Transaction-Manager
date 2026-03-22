import { ApiResponse } from '@/lib/api';
import db from '@/lib/database';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/api/inventory'>,
) {
  try {
    // GET logic here
    const items = await db.inventoryItem.findMany({});
    return ApiResponse.success(items);
  } catch (error) {
    return ApiResponse.serverError();
  }
}

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/inventory'>,
) {
  try {
    const body = await req.json();
    const items = await db.inventoryItem.create({ data: body });
    return ApiResponse.success(items);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}
