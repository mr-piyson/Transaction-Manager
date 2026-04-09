import { Dates, DatesAgo, FormatKey } from './date';
import { CurrencyCode, CURRENCIES, fromDatabase } from './money';
import currency from 'currency.js';

// Pre-compute currency.js options for O(1) access
const formatConfigs = Object.keys(CURRENCIES).reduce(
  (acc, key) => {
    const c = CURRENCIES[key as CurrencyCode];
    acc[key as CurrencyCode] = {
      symbol: c.symbol,
      precision: c.precision,
      separator: c.separator,
      decimal: c.decimal,
      pattern: c.pattern,
    };
    return acc;
  },
  {} as Record<CurrencyCode, currency.Options>,
);

export const Format = {
  money: {
    /**
     * Use this for values already in decimal format (e.g., 5.1)
     */
    decimal: (val: number, code: CurrencyCode = 'BHD') => {
      return currency(val, formatConfigs[code]).format();
    },

    /**
     * Use this for values from the Database (e.g., 5100 -> "BD 5.100")
     * This is the "Smooth Conversion" path.
     */
    db: (intVal: number, code: CurrencyCode = 'BHD') => {
      const decimalVal = fromDatabase(intVal, code);
      return currency(decimalVal, formatConfigs[code]).format();
    },
  },

  date: {
    any: (d: Date | string | number | null, type: FormatKey = 'display') => Dates(d, type),
    relative: (d: Date | string | null) => DatesAgo(d),
    slot: (d: Date) => Dates(d, 'time12'),
  },

  id: {
    invoice: (n: number) => `INV-${String(n).padStart(5, '0')}`,
    receipt: (n: number) => `RCP-${String(n).padStart(6, '0')}`,
    slug: (s: string) =>
      s
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''),
  },

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
