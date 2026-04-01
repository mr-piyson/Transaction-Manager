import { ApiResponse } from '@/lib/server';
import db from '@/lib/db';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { invoiceId, inventoryItemId, quantity = 1, isGroup, parentId } = data;

    if (!invoiceId) return ApiResponse.serverError('Missing invoiceId', 400);

    return await db.$transaction(async (tx) => {
      let newLine;

      if (isGroup) {
        // 1. Create Group Line (Simple, starts at 0)
        newLine = await tx.invoiceLine.create({
          data: {
            invoiceId,
            description: data.description || 'Group',
            isGroup: true,
            purchasePrice: 0,
            salesPrice: 0,
            quantity: 1,
            total: 0,
          },
        });
      } else {
        // 1. Fetch Item & Parent Group simultaneously
        const [item, parentGroup] = await Promise.all([
          tx.inventoryItem.findUnique({ where: { id: inventoryItemId } }),
          parentId ? tx.invoiceLine.findUnique({ where: { id: parentId } }) : Promise.resolve(null),
        ]);

        if (!item) throw new Error('Inventory item not found');

        const lineTotal = item.salesPrice * quantity;

        // 2. Create the Item Line
        newLine = await tx.invoiceLine.create({
          data: {
            invoiceId,
            inventoryItemId,
            description: item.name,
            purchasePrice: item.purchasePrice,
            salesPrice: item.salesPrice,
            quantity,
            total: lineTotal,
            parentId,
          },
        });

        // 3. Increment the Parent Group (Atomic update)
        if (parentId) {
          await tx.invoiceLine.update({
            where: { id: parentId },
            data: {
              purchasePrice: { increment: item.purchasePrice * quantity },
              salesPrice: { increment: item.salesPrice * quantity },
              total: { increment: lineTotal },
            },
          });
        }

        // 4. Increment the Invoice Totals (Atomic update)
        // This avoids calling updateInvoiceTotals() which re-reads the whole DB
        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            subtotal: { increment: lineTotal },
            total: { increment: lineTotal },
          },
        });
      }

      return ApiResponse.success(newLine);
    });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}
