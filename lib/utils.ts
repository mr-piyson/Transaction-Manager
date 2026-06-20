import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CurrencyCode =
  | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'BHD'
  | 'AED' | 'SAR' | 'KWD' | 'QAR' | 'OMR';

export const CURRENCIES: Record<
  CurrencyCode,
  { code: string; symbol: string; label: string; precision: number; separator: string; decimal: string }
> = {
  USD: { code: 'USD', symbol: '$', label: 'US Dollar', precision: 2, separator: ',', decimal: '.' },
  EUR: { code: 'EUR', symbol: '€', label: 'Euro', precision: 2, separator: '.', decimal: ',' },
  GBP: { code: 'GBP', symbol: '£', label: 'British Pound', precision: 2, separator: ',', decimal: '.' },
  JPY: { code: 'JPY', symbol: '¥', label: 'Japanese Yen', precision: 0, separator: ',', decimal: '.' },
  BHD: { code: 'BHD', symbol: 'BD', label: 'Bahraini Dinar', precision: 3, separator: ',', decimal: '.' },
  AED: { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham', precision: 2, separator: ',', decimal: '.' },
  SAR: { code: 'SAR', symbol: '﷼', label: 'Saudi Riyal', precision: 2, separator: ',', decimal: '.' },
  KWD: { code: 'KWD', symbol: 'KD', label: 'Kuwaiti Dinar', precision: 3, separator: ',', decimal: '.' },
  QAR: { code: 'QAR', symbol: '﷼', label: 'Qatari Riyal', precision: 2, separator: ',', decimal: '.' },
  OMR: { code: 'OMR', symbol: '﷼', label: 'Omani Rial', precision: 3, separator: ',', decimal: '.' },
} as const;

export function formatAmount(
  amount: number | string | null | undefined,
  currency: CurrencyCode = 'BHD',
): string {
  const num = Number(amount ?? 0);
  const config = CURRENCIES[currency];
  return `${config.symbol} ${num.toLocaleString('en-US', {
    minimumFractionDigits: config.precision,
    maximumFractionDigits: config.precision,
  })}`;
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency: CurrencyCode = 'BHD',
): string {
  return formatAmount(amount, currency);
}

/**
 * Convert stored integer back to a plain decimal string for input fields.
 * 1500 + "BHD" → "1.500"
 */
export function deformatMoney(amount: number, currency: CurrencyCode): string {
  const { precision } = CURRENCIES[currency] ?? { precision: 2 };
  const value = amount / 10 ** precision;
  return value.toFixed(precision); // always returns correct decimal places
}

// Convert display input to integer
// toSmallestUnit(1.5, 'BHD') → 1500
// toSmallestUnit(15, 'USD') → 1500
export function toSmallestUnit(display: number, currency: CurrencyCode): number {
  const config = CURRENCIES[currency];
  return Math.round(display * 10 ** config.precision);
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
