/**
 *
 * Handles stock movements triggered by invoice status transitions.
 *
 * UNITS OF MEASURE:
 * Stock.quantity is always in the item's BASE UNIT. Callers must pass
 * `InvoiceLine.baseQuantity` (never the selected-unit `quantity`) as
 * `StockLine.quantity` — see docs/UOM-plan.md.
 *
 * CRITICAL RULE:
 * Stock quantity MUST only change through a StockMovement row + a Stock update
 * inside the same $transaction. Never update Stock.quantity directly.
 *
 * STATUS TRANSITIONS THAT AFFECT STOCK:
 * DRAFT → SENT     → SALE_OUTBOUND movements for each PRODUCT line
 * SENT  → CANCELLED → Reverse (RETURN_INBOUND) movements
 * Any CREDIT_NOTE creation linked to an INVOICE → RETURN_INBOUND movements
 * SENT CREDIT_NOTE → CANCELLED → RETURN_OUTBOUND (re-deduct) movements
 *
 * NEGATIVE STOCK GUARD:
 * Before deducting, we verify sufficient stock exists in the target warehouse.
 * If insufficient, we throw an UnprocessableError listing each shortfall.
 * This is a HARD block — the invoice cannot be confirmed until stock is
 * available. (Some businesses want a soft warning; adjust to your needs.)
 *
 * AVERAGE COST UPDATE:
 * On SALE_OUTBOUND we record unitCost = item.averageCost at movement time.
 * This enables COGS reporting without recalculating historical averages.
 * averageCost itself is maintained on purchase receipts (base units).
 */

import type { Prisma } from "@prisma/client";
import { UnprocessableError } from "@/lib/error";

type TransactionClient = Prisma.TransactionClient;

interface StockLine {
  itemId: string;
  itemType: string; // Only PRODUCT lines trigger stock
  quantity: number; // Base-unit quantity, positive (we handle sign)
  invoiceLineId: string;
}

interface StockMovementOptions {
  tx: TransactionClient;
  organizationId: string;
  warehouseId: string;
  userId: string;
  lines: StockLine[];
}

// ---------------------------------------------------------------------------
// Deduct stock when invoice is confirmed (DRAFT → SENT)
// ---------------------------------------------------------------------------

export async function deductStockForInvoice(
  opts: StockMovementOptions,
): Promise<void> {
  const { tx, organizationId, warehouseId, userId, lines } = opts;

  // Filter to PRODUCT lines only
  const productLines = lines.filter((l) => l.itemType === "PRODUCT");
  if (productLines.length === 0) return;

  // ── 1. Check sufficient stock ──────────────────────────────────────────
  const shortfalls: string[] = [];

  for (const line of productLines) {
    const stock = await tx.stock.findUnique({
      where: {
        itemId_warehouseId: {
          itemId: line.itemId,
          warehouseId,
        },
      },
      select: { quantity: true, item: { select: { sku: true, name: true } } },
    });

    const available = Number(stock?.quantity ?? 0);
    if (available < line.quantity) {
      const itemName =
        stock?.item.name ??
        (
          await tx.item.findUnique({
            where: { id: line.itemId },
            select: { name: true },
          })
        )?.name ??
        line.itemId;
      shortfalls.push(
        `${itemName}: need ${line.quantity}, available ${available}`,
      );
    }
  }

  if (shortfalls.length > 0) {
    throw new UnprocessableError(
      `Insufficient stock for the following items:\n${shortfalls.join("\n")}`,
      { shortfalls },
    );
  }

  // ── 2. Deduct stock + write movements ─────────────────────────────────
  for (const line of productLines) {
    // Load current average cost for COGS recording
    const item = await tx.item.findUnique({
      where: { id: line.itemId },
      select: { averageCost: true },
    });

    await tx.stockMovement.create({
      data: {
        type: "SALE_OUTBOUND",
        quantity: -Math.abs(line.quantity), // Negative = leaving warehouse
        unitCost: item?.averageCost ?? 0,
        invoiceLineId: line.invoiceLineId,
        itemId: line.itemId,
        fromWarehouseId: warehouseId,
        userId,
        organizationId,
      },
    });

    await tx.stock.update({
      where: {
        itemId_warehouseId: { itemId: line.itemId, warehouseId },
      },
      data: {
        quantity: { decrement: line.quantity },
        version: { increment: 1 },
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Return stock when invoice is cancelled (reverse the SALE_OUTBOUND movements)
// ---------------------------------------------------------------------------

export async function returnStockForCancelledInvoice(
  opts: StockMovementOptions,
): Promise<void> {
  const { tx, organizationId, warehouseId, userId, lines } = opts;

  const productLines = lines.filter((l) => l.itemType === "PRODUCT");
  if (productLines.length === 0) return;

  for (const line of productLines) {
    await tx.stockMovement.create({
      data: {
        type: "RETURN_INBOUND",
        quantity: Math.abs(line.quantity), // Positive = returning to warehouse
        invoiceLineId: line.invoiceLineId,
        itemId: line.itemId,
        toWarehouseId: warehouseId,
        userId,
        organizationId,
        notes: "Stock returned — invoice cancelled",
      },
    });

    await tx.stock.upsert({
      where: {
        itemId_warehouseId: { itemId: line.itemId, warehouseId },
      },
      create: {
        itemId: line.itemId,
        warehouseId,
        organizationId,
        quantity: line.quantity,
      },
      update: {
        quantity: { increment: line.quantity },
        version: { increment: 1 },
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Return stock for a credit note (partial return — uses credit note lines)
// ---------------------------------------------------------------------------

export async function returnStockForCreditNote(
  opts: StockMovementOptions,
): Promise<void> {
  const { tx, organizationId, warehouseId, userId, lines } = opts;

  const productLines = lines.filter((l) => l.itemType === "PRODUCT");
  if (productLines.length === 0) return;

  for (const line of productLines) {
    await tx.stockMovement.create({
      data: {
        type: "RETURN_INBOUND",
        quantity: Math.abs(line.quantity),
        invoiceLineId: line.invoiceLineId,
        itemId: line.itemId,
        toWarehouseId: warehouseId,
        userId,
        organizationId,
        notes: "Stock returned — credit note",
      },
    });

    await tx.stock.upsert({
      where: {
        itemId_warehouseId: { itemId: line.itemId, warehouseId },
      },
      create: {
        itemId: line.itemId,
        warehouseId,
        organizationId,
        quantity: line.quantity,
      },
      update: {
        quantity: { increment: line.quantity },
        version: { increment: 1 },
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Re-deduct stock when a SENT credit note is cancelled (undo the RETURN_INBOUND)
// ---------------------------------------------------------------------------

export async function reDeductStockForCancelledCreditNote(
  opts: StockMovementOptions,
): Promise<void> {
  const { tx, organizationId, warehouseId, userId, lines } = opts;

  const productLines = lines.filter((l) => l.itemType === "PRODUCT");
  if (productLines.length === 0) return;

  // Same hard block as deductStockForInvoice — never drive stock negative.
  const shortfalls: string[] = [];
  for (const line of productLines) {
    const stock = await tx.stock.findUnique({
      where: {
        itemId_warehouseId: { itemId: line.itemId, warehouseId },
      },
      select: { quantity: true, item: { select: { name: true } } },
    });
    const available = Number(stock?.quantity ?? 0);
    if (available < line.quantity) {
      shortfalls.push(
        `${stock?.item.name ?? line.itemId}: need ${line.quantity}, available ${available}`,
      );
    }
  }
  if (shortfalls.length > 0) {
    throw new UnprocessableError(
      `Cannot cancel this credit note — insufficient stock to take back:\n${shortfalls.join("\n")}`,
      { shortfalls },
    );
  }

  for (const line of productLines) {
    await tx.stockMovement.create({
      data: {
        type: "RETURN_OUTBOUND",
        quantity: -Math.abs(line.quantity),
        invoiceLineId: line.invoiceLineId,
        itemId: line.itemId,
        fromWarehouseId: warehouseId,
        userId,
        organizationId,
        notes: "Stock re-deducted — credit note cancelled",
      },
    });

    await tx.stock.update({
      where: {
        itemId_warehouseId: { itemId: line.itemId, warehouseId },
      },
      data: {
        quantity: { decrement: line.quantity },
        version: { increment: 1 },
      },
    });
  }
}
