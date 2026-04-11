import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CurrencyCode = keyof typeof CURRENCIES;

export const CURRENCIES = {
  USD: {
    code: 'USD',
    symbol: '$',
    label: 'US Dollar',
    precision: 2,
    separator: ',',
    decimal: '.',
    pattern: '! #',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    label: 'Euro',
    precision: 2,
    separator: '.',
    decimal: ',',
    pattern: '! #',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    label: 'Japanese Yen',
    precision: 0,
    separator: ',',
    decimal: '.',
    pattern: '! #',
  },
  BHD: {
    code: 'BHD',
    symbol: 'BD',
    label: 'Bahraini Dinar',
    precision: 3,
    separator: ',',
    decimal: '.',
    pattern: '! #',
  },
} as const;

// Convert integer fils/cents to display string
// formatAmount(1500, 'BHD') → 'BD 1.500'
// formatAmount(1500, 'USD') → '$15.00'
export function formatAmount(amount: number, currency: CurrencyCode = 'BHD'): string {
  const config = CURRENCIES[currency];
  const displayAmount = amount / Math.pow(10, config.precision);

  return `${config.symbol} ${displayAmount.toFixed(config.precision)}`;
}

// Convert display input to integer
// toSmallestUnit(1.5, 'BHD') → 1500
// toSmallestUnit(15.00, 'USD') → 1500
export function toSmallestUnit(display: number, currency: CurrencyCode): number {
  const config = CURRENCIES[currency];
  return Math.round(display * Math.pow(10, config.precision));
}

// Generate INV-2024-0001 style numbers
// Must be called inside a $transaction
export async function generateDocNumber(
  tx: any, // PrismaTransactionClient type is not available here, using any
  organizationId: number,
  prefix: 'INV' | 'PO' | 'CN',
): Promise<string> {
  const last = await tx.invoice.findFirst({
    where: {
      organizationId,
      number: {
        startsWith: `${prefix}-`,
      },
    },
    orderBy: { number: 'desc' },
  });

  let nextSeq = 1;
  if (last) {
    const parts = last.number.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}-${nextSeq.toString().padStart(5, '0')}`;
}

// Calculate tax amount in integer
// tax: percentage (10 = 10%)
export function calcTax(unitPrice: number, quantity: number, tax: number): number {
  return Math.round((unitPrice * quantity * tax) / 100);
}

// Calculate line total
// unitPrice, quantity, discount, tax are in smallest unit
export function calcLineTotal(
  unitPrice: number,
  quantity: number,
  discount: number,
  tax: number,
): number {
  const subtotal = unitPrice * quantity;
  const discounted = subtotal - discount;
  return discounted + tax;
}
