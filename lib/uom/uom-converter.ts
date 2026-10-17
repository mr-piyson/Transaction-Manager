/**
 * Pure Unit-of-Measure conversion helpers (docs/UOM-plan.md Phase 2).
 *
 * - No DB, no React — safe to use from any tRPC layer and to unit-test with
 *   `bun test`.
 * - All arithmetic is done with `Prisma.Decimal` (never JS floats).
 * - The Base Unit of an item is the single source of truth for inventory;
 *   `factor` means "1 selected unit = `factor` base units".
 * - All rounding lives here: quantities → 4 dp (Decimal(14,4) storage),
 *   costs/prices → 6 dp (Decimal(20,6) storage).
 */

import { Prisma } from "@prisma/client";
import { UnprocessableError } from "@/lib/error";

export type DecimalInput = string | number | Prisma.Decimal;

/** Storage precision for quantities — Stock.quantity / StockMovement.quantity. */
export const QTY_DP = 4;
/** Storage precision for money per unit — unitCost / unitPrice / averageCost. */
export const COST_DP = 6;

function toDecimal(value: DecimalInput, label: string): Prisma.Decimal {
  const d = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  if (!d.isFinite()) {
    throw new UnprocessableError(`Invalid ${label}: ${String(value)}`, {
      value: String(value),
    });
  }
  return d;
}

/**
 * Validates a conversion factor: must be a finite number > 0.
 * Zero and negative factors are rejected (division by zero / inverted stock).
 */
export function assertFactor(factor: DecimalInput): Prisma.Decimal {
  const f = toDecimal(factor, "conversion factor");
  if (f.lte(0)) {
    throw new UnprocessableError(
      `Conversion factor must be greater than 0 (received ${f.toFixed()}).`,
      { factor: f.toFixed() },
    );
  }
  return f;
}

/** Rounds a quantity to storage precision (4 dp). */
export function roundQty(value: DecimalInput): Prisma.Decimal {
  return toDecimal(value, "quantity").toDecimalPlaces(QTY_DP);
}

/** Rounds a per-unit cost/price to storage precision (6 dp). */
export function roundCost(value: DecimalInput): Prisma.Decimal {
  return toDecimal(value, "amount").toDecimalPlaces(COST_DP);
}

/** Selected-unit quantity → base quantity (`qty × factor`). */
export function convertToBase(
  qty: DecimalInput,
  factor: DecimalInput,
): Prisma.Decimal {
  return roundQty(toDecimal(qty, "quantity").times(assertFactor(factor)));
}

/** Base quantity → selected-unit quantity (`baseQty ÷ factor`). */
export function fromBase(
  baseQty: DecimalInput,
  factor: DecimalInput,
): Prisma.Decimal {
  return roundQty(toDecimal(baseQty, "quantity").div(assertFactor(factor)));
}

/**
 * Price/cost per selected unit → per base unit (`pricePerSelected ÷ factor`).
 * 152.500/Box with 1 Box = 305 m → 0.500000 per m (§3.2 baseUnitCost).
 */
export function baseUnitAmount(
  pricePerSelected: DecimalInput,
  factor: DecimalInput,
): Prisma.Decimal {
  return roundCost(
    toDecimal(pricePerSelected, "price").div(assertFactor(factor)),
  );
}

/**
 * Converts a per-unit price between two units of the same item.
 * `fromFactor`/`toFactor` are each unit's factor to base (base = 1).
 * 152.500/Box(305) → per m(1) = 152.5 × 1 ÷ 305 = 0.500000.
 */
export function convertUnitPrice(
  pricePerUnit: DecimalInput,
  fromFactor: DecimalInput,
  toFactor: DecimalInput,
): Prisma.Decimal {
  const price = toDecimal(pricePerUnit, "price");
  const from = assertFactor(fromFactor);
  const to = assertFactor(toFactor);
  return roundCost(price.times(to).div(from));
}

/**
 * Derives a base-unit cost from a line total so rounding never leaks value
 * (§3.3: prefer `line total ÷ baseQuantity` for average-cost updates).
 */
export function deriveBaseUnitCost(
  lineTotal: DecimalInput,
  baseQuantity: DecimalInput,
): Prisma.Decimal {
  const baseQty = toDecimal(baseQuantity, "quantity");
  if (baseQty.lte(0)) {
    throw new UnprocessableError(
      "Cannot derive a base unit cost from a non-positive base quantity.",
      { baseQuantity: baseQty.toFixed() },
    );
  }
  return roundCost(toDecimal(lineTotal, "total").div(baseQty));
}

export interface UomDefinition {
  unitId: string;
  factor: DecimalInput;
  isActive?: boolean;
  deletedAt?: Date | string | null;
}

/** Minimal item shape needed to resolve a factor (matches the Prisma include). */
export interface UomItemLike {
  /** The item's Base Unit id (implicit factor 1). */
  unitId: string | null;
  uoms?: readonly UomDefinition[] | null;
}

/**
 * Resolves the factor for `unitId` on `item`:
 * - base unit (or no unitId) → 1
 * - configured active `ItemUom` → its factor
 * - anything else → throws (unit not allowed on this item)
 */
export function resolveUomFactor(
  item: UomItemLike,
  unitId?: string | null,
): Prisma.Decimal {
  if (!unitId || unitId === item.unitId) {
    return new Prisma.Decimal(1);
  }
  const row = item.uoms?.find(
    (u) => u.unitId === unitId && u.isActive !== false && !u.deletedAt,
  );
  if (!row) {
    throw new UnprocessableError(
      "The selected unit is not configured for this item.",
      { unitId },
    );
  }
  return assertFactor(row.factor);
}

/** Formats a quantity without trailing zeros, never in exponential notation. */
export function formatQty(value: DecimalInput): string {
  return roundQty(value).toFixed();
}

/**
 * "610 m" or, when an alternative unit is given,
 * "610 m (≈ 2.00 Box)" — for read-only views and print templates.
 */
export function formatQtyWithUom(
  baseQty: DecimalInput,
  baseUnit: string,
  altUnit?: { code: string; factor: DecimalInput },
): string {
  const qty = formatQty(baseQty);
  if (!altUnit) return `${qty} ${baseUnit}`.trim();
  const factor = assertFactor(altUnit.factor);
  if (factor.equals(1)) return `${qty} ${baseUnit}`.trim();
  const alt = fromBase(baseQty, factor);
  return `${qty} ${baseUnit} (≈ ${alt.toFixed(2)} ${altUnit.code})`;
}
