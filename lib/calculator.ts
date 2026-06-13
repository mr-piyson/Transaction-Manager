/**
 * src/server/modules/invoices/calculator.ts
 *
 * Pure invoice totals calculation — no side effects, no DB calls.
 *
 * WHY A SEPARATE CALCULATOR MODULE?
 * Invoice total computation is the most error-prone part of any billing system.
 * Keeping it as a pure function means:
 * 1. It can be unit-tested exhaustively with no mocking.
 * 2. It runs identically on create and update.
 * 3. The router just calls it and persists the result — no logic duplication.
 *
 * DECIMAL ARITHMETIC:
 * We use JS's built-in number type here for simplicity, but the input values
 * come from Prisma Decimal (stored as string). All values are parsed to float
 * at the boundary. For currencies where sub-unit precision matters beyond 6
 * decimal places (unlikely in BHD which uses 3), swap to a Decimal library.
 *
 * ROUNDING:
 * Tax is rounded per-line (not summed then rounded) to match standard VAT
 * return calculations. The total is the sum of per-line totals, not a
 * re-calculated top-level formula.
 */

export interface LineInput {
  quantity: number;
  unitPrice: number;
  discountAmt?: number;
  taxRateSnapshot?: number; // e.g. 10 for 10%
  purchasePrice?: number;
}

export interface LineResult extends LineInput {
  lineSubtotal: number; // unitPrice × quantity
  discountAmt: number; // resolved discount
  taxableAmt: number; // lineSubtotal - discountAmt
  taxAmt: number; // taxableAmt × (taxRate / 100), rounded to 6dp
  total: number; // taxableAmt + taxAmt
  costTotal: number; // purchasePrice × quantity (for GP tracking)
}

export interface InvoiceTotals {
  lines: LineResult[];
  subtotal: number; // sum of (unitPrice × qty)
  discountTotal: number; // sum of discountAmt
  taxTotal: number; // sum of taxAmt
  total: number; // subtotal - discountTotal + taxTotal
  costTotal: number; // sum of costTotal (COGS)
}

const round = (n: number, dp = 6): number => Math.round(n * 10 ** dp) / 10 ** dp;

/**
 * calculateInvoiceTotals
 *
 * Takes raw line inputs and returns computed totals for all lines + the header.
 * Store ALL returned values on the Invoice and InvoiceLine rows.
 */
export function calculateInvoiceTotals(lines: LineInput[]): InvoiceTotals {
  const computed: LineResult[] = lines.map((line) => {
    const qty = round(line.quantity);
    const price = round(line.unitPrice);
    const discount = round(line.discountAmt ?? 0);
    const taxRate = line.taxRateSnapshot ?? 0;
    const purchasePrice = line.purchasePrice ?? 0;

    const lineSubtotal = round(qty * price);
    const taxableAmt = round(lineSubtotal - discount);
    const taxAmt = round(taxableAmt * (taxRate / 100));
    const total = round(taxableAmt + taxAmt);
    const costTotal = round(qty * purchasePrice);

    return {
      ...line,
      quantity: qty,
      unitPrice: price,
      lineSubtotal,
      discountAmt: discount,
      taxableAmt,
      taxAmt,
      total,
      costTotal,
    };
  });

  const subtotal = round(computed.reduce((s, l) => s + l.lineSubtotal, 0));
  const discountTotal = round(computed.reduce((s, l) => s + l.discountAmt, 0));
  const taxTotal = round(computed.reduce((s, l) => s + l.taxAmt, 0));
  const total = round(computed.reduce((s, l) => s + l.total, 0));
  const costTotal = round(computed.reduce((s, l) => s + l.costTotal, 0));

  return { lines: computed, subtotal, discountTotal, taxTotal, total, costTotal };
}
