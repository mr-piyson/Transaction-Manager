/**
 * Weighted-average cost updates for inventory receipts (docs/UOM-plan.md §3.3).
 *
 * All quantities and values are in the item's BASE UNIT:
 *   newAvg = (prevQty × prevAvg + receivedValue) / (prevQty + receivedBaseQty)
 *
 * When stock is empty the received value is simply `receivedValue ÷
 * receivedBaseQty` (deriveBaseUnitCost), so rounding never leaks value.
 */

import { Prisma } from "@prisma/client";
import { UnprocessableError } from "@/lib/error";
import {
  type DecimalInput,
  deriveBaseUnitCost,
  roundCost,
} from "@/lib/uom-converter";

function toDec(value: DecimalInput, label: string): Prisma.Decimal {
  const d = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  if (!d.isFinite()) {
    throw new UnprocessableError(`Invalid ${label}: ${String(value)}`);
  }
  return d;
}

/**
 * Computes the new weighted-average cost after receiving stock.
 *
 * @param prevQty total stock on hand (all warehouses) BEFORE the receipt, base units
 * @param prevAvgCost item.averageCost BEFORE the receipt
 * @param receivedBaseQty base quantity being received (must be > 0 to update)
 * @param receivedValue total cost of the received portion (baseUnitCost × receivedBaseQty)
 */
export function computeWeightedAverage(
  prevQty: DecimalInput,
  prevAvgCost: DecimalInput,
  receivedBaseQty: DecimalInput,
  receivedValue: DecimalInput,
): Prisma.Decimal {
  const qty = toDec(prevQty, "quantity");
  const avg = toDec(prevAvgCost, "average cost");
  const rQty = toDec(receivedBaseQty, "quantity");
  const rValue = toDec(receivedValue, "value");

  if (rQty.lte(0)) return roundCost(avg);
  if (qty.lte(0)) return deriveBaseUnitCost(rValue, rQty);

  const newTotalValue = qty.times(avg).plus(rValue);
  return roundCost(newTotalValue.div(qty.plus(rQty)));
}
