import { ApiResponse } from '@/lib/server';
import db from '@/lib/database';
import { NextRequest, NextResponse } from 'next/server';

import { getFileExtension, saveImage } from '@/lib/files';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/inventory'>) {
  try {
    // GET logic here
    const items = await db.inventoryItem.findMany({});
    return ApiResponse.success(items);
  } catch (error) {
    return ApiResponse.serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // 1. Extract and Validate Data
    const name = formData.get('name')?.toString();
    const code = formData.get('code')?.toString();
    const purchasePrice = Number(formData.get('purchasePrice'));
    const salesPrice = Number(formData.get('salesPrice'));
    const description = formData.get('description')?.toString();
    const image = formData.get('image') as File | null;
    let imagePath = null;

    // 2. Early Exit: Prevent "null" errors before hitting the DB
    if (!name || !code || isNaN(purchasePrice)) {
      return ApiResponse.serverError('Data is not valid');
    }
    if (image) {
      // 3. File Validation (15MB limit)
      const MAX_SIZE = 15 * 1024 * 1024;
      if (image.size > MAX_SIZE) {
        return ApiResponse.serverError('Image too large. Max size is 15MB.');
      }

      imagePath = `${code}.${getFileExtension(image)}`;

      // 4. Critical: Save Image FIRST (or use a Transaction)
      // If the image fails to save, we shouldn't have a record in the DB pointing to nothing.
      await saveImage(image, { fileName: imagePath, maxSize: MAX_SIZE });
    }

    // 5. Database Operation
    const item = await db.inventoryItem.create({
      data: {
        name,
        code,
        purchasePrice,
        salesPrice,
        description: description ?? '',
        image: imagePath,
      },
    });

    return ApiResponse.success(item);
  } catch (error) {
    console.error('[INVENTORY_POST]', error); // Log for debugging
    return ApiResponse.serverError(error);
  }
}
