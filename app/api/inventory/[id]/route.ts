import { ApiResponse } from '@/lib/server';
import db from '@/lib/database';
import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/inventory/[id]'>) {
  try {
    const id = Number((await ctx.params).id);
    const items = await db.inventoryItem.findUnique({
      where: {
        id,
      },
    });
    return ApiResponse.success(items);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext<'/api/inventory/[id]'>) {
  try {
    const id = Number((await ctx.params).id);
    const items = await db.inventoryItem.delete({
      where: {
        id,
      },
    });
    if (items.image) {
      await fs.unlink(path.join(process.cwd(), 'public', 'uploads', items.image));
    }
    return ApiResponse.success(items);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}
