import { ApiResponse } from '@/lib/server';
import db from '@/lib/database';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const {
      invoiceId,
      inventoryItemId,
      quantity = 1,
      isGroup,
      description,
      parentId,
    } = await req.json();

    if (!invoiceId) {
      return ApiResponse.serverError('Missing required field: invoiceId', 400);
    }

    if (isGroup) {
      const groupLine = await db.invoiceLine.create({
        data: {
          invoiceId,
          description: description || 'Group',
          isGroup: true,
          purchasePrice: 0,
          salesPrice: 0,
          quantity: 1,
          total: 0,
        },
      });
      return ApiResponse.success(groupLine);
    }

    if (!inventoryItemId) {
      return ApiResponse.serverError('Missing required field: inventoryItemId', 400);
    }

    // Get the inventory item to get the prices
    const item = await db.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });

    if (!item) {
      return ApiResponse.serverError('Inventory item not found', 404);
    }

    const total = item.salesPrice * quantity;

    const invoiceLine = await db.invoiceLine.create({
      data: {
        invoiceId,
        inventoryItemId,
        description: item.name,
        purchasePrice: item.purchasePrice,
        salesPrice: item.salesPrice,
        quantity,
        total,
        parentId,
      },
    });

    // Update the invoice totals
    await updateInvoiceTotals(invoiceId);

    return ApiResponse.success(invoiceLine);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

async function updateInvoiceTotals(invoiceId: number) {
  const lines = await db.invoiceLine.findMany({
    where: { invoiceId },
  });

  // 1) Update group totals
  const groups = lines.filter((l) => l.isGroup);
  for (const group of groups) {
    const children = lines.filter((l) => l.parentId === group.id);
    const groupPurchase = children.reduce((acc, l) => acc + (l.purchasePrice * l.quantity), 0);
    const groupSales = children.reduce((acc, l) => acc + (l.salesPrice * l.quantity), 0);
    const groupTotal = children.reduce((acc, l) => acc + l.total, 0);
    await db.invoiceLine.update({
      where: { id: group.id },
      data: {
        purchasePrice: groupPurchase,
        salesPrice: groupSales,
        total: groupTotal,
      },
    });
  }

  // 2) Update Invoice Total (summing only non-group lines to avoid double-counting)
  const nonGroupLines = lines.filter((l) => !l.isGroup);
  const subtotal = nonGroupLines.reduce((acc, line) => acc + line.total, 0);
  
  // For now, let's assume discountTotal and taxTotal are 0 or handled elsewhere
  const total = subtotal;

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal,
      total,
    },
  });
}
