// format.ts
// import { CurrencyCode, Money } from './money';
// import { Dates, DatesAgo, FormatKey } from './date';

import { Dates, DatesAgo } from './date';
import { CurrencyCode } from './money';

// Proposed unified structure
import { FormatKey } from '@/lib/date';
import { CURRENCIES, fromCents } from '@/lib/money';
import currency from 'currency.js';

export const Format = {
  /**
   * Money & Finance
   * All methods expect the raw number (decimal) OR the integer from DB
   */
  money: {
    // Standard display: 15.75 -> "15.750 BD"
    amount: (val: number, code: CurrencyCode = 'BHD') => currency(val, CURRENCIES[code]).format(),

    // Use this for DB integers: 15750 -> "15.750 BD"
    fromDb: (val: number, code: CurrencyCode = 'BHD') =>
      currency(fromCents(val, code), CURRENCIES[code]).format(),

    // Math engine (Returns a currency object for chaining)
    calc: (val: number, code: CurrencyCode = 'BHD') => currency(val, CURRENCIES[code]),

    // Quick Tax helper: Format.money.vat(100) -> 10.000
    vat: (val: number, rate = 0.1, code: CurrencyCode = 'BHD') =>
      currency(val, CURRENCIES[code]).multiply(rate),
  },

  /**
   * Dates (Wraps your date-fns logic)
   */
  date: {
    any: (d: Date | string | number | null, type: FormatKey = 'display') => Dates(d, type),
    relative: (d: Date | string | null) => DatesAgo(d),
    slot: (d: Date) => Dates(d, 'time12'), // Quick time format
  },

  /**
   * Document & System IDs
   */
  id: {
    invoice: (n: number) => `INV-${String(n).padStart(5, '0')}`,
    receipt: (n: number) => `RCP-${String(n).padStart(6, '0')}`,
    slug: (s: string) =>
      s
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''),
  },

  /**
   * Text Manipulation
   */
  text: {
    truncate: (s: string, len = 50) => (s.length > len ? `${s.slice(0, len)}…` : s),
    initials: (name: string) =>
      name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase(),
  },
} as const;
