// money.ts
import currency, { Options } from 'currency.js';

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

// This handles the "Integer to Decimal" logic for ERP storage
export const toCents = (num: number, code: CurrencyCode) =>
  Math.round(num * Math.pow(10, CURRENCIES[code].precision));

export const fromCents = (num: number, code: CurrencyCode) =>
  num / Math.pow(10, CURRENCIES[code].precision);
