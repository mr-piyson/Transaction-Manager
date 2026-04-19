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
export function formatAmount(
  amount: number | BigInt | string | null | undefined,
  currency: CurrencyCode = 'BHD',
): string {
  if (!amount) amount = 0;
  const config = CURRENCIES[currency];
  const displayAmount = Number(amount) / Math.pow(10, config.precision);

  return `${config.symbol} ${displayAmount.toFixed(config.precision)}`;
}

/**
 * Convert stored integer back to a plain decimal string for input fields.
 * 1500 + "BHD" → "1.500"
 */
export function deformatMoney(amount: number, currency: CurrencyCode): string {
  const { precision } = CURRENCIES[currency] ?? { precision: 2 };
  const value = amount / Math.pow(10, precision);
  return value.toFixed(precision); // always returns correct decimal places
}

// Convert display input to integer
// toSmallestUnit(1.5, 'BHD') → 1500
// toSmallestUnit(15, 'USD') → 1500
export function toSmallestUnit(display: number, currency: CurrencyCode): number {
  const config = CURRENCIES[currency];
  return Math.round(display * Math.pow(10, config.precision));
}

// Divide a money amount by a factor
export function divideMoney(amount: number, divisor: number) {
  return Math.round(amount / divisor);
}

// Calculate percentage of a money amount
export function percentageOf(amount: number, percentage: number) {
  return Math.round((amount * percentage) / 100);
}

// multiply a money amount by a factor
export function multiplyMoney(amount: number, factor: number) {
  return Math.round(amount * factor);
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

// Must be called inside a $transaction
export function formatID(prefix: 'INV' | 'PO' | 'CN', number: string | number): string {
  return `${prefix}-${number.toString().padStart(5, '0')}`;
}
// helper to convert BigInt to JSON
(BigInt.prototype as any).toJSON = function () {
  return Number(this); // Use Number if you aren't dealing with trillions
};

// formatDate(new Date()) → "sat 18 Apr 2024"
export function formatDate(date: Date | null | undefined): string {
  return date?.toUTCString().slice(0, -13) || '';
}
