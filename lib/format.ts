// format.ts
import { CurrencyCode, Money } from './money';
import { Dates, DatesAgo, FormatKey } from './date';

export class Format {
  // ─── Money ────────────────────────────────────────────────────────────
  static money(amount: number, curr: CurrencyCode = 'BHD'): string {
    return Money.format(amount, curr);
  }

  // ─── Dates ────────────────────────────────────────────────────────────
  static date(date: Date | string | number | null, type: FormatKey): string {
    return Dates(date, type);
  }

  static dateAgo(date: Date | string | null): string {
    return DatesAgo(date);
  }

  // ─── IDs ──────────────────────────────────────────────────────────────
  /**
   * Generic padded ID. Format.id('INV', 1) → "INV-00001"
   */
  static id(prefix: string, num: number, pad = 5): string {
    return `${prefix}-${String(num).padStart(pad, '0')}`;
  }

  static invoice(num: number): string {
    return Format.id('INV', num);
  }

  static order(num: number): string {
    return Format.id('ORD', num);
  }

  static receipt(num: number): string {
    return Format.id('REC', num);
  }

  // ─── Text ─────────────────────────────────────────────────────────────
  static truncate(str: string, max = 50): string {
    return str.length > max ? `${str.slice(0, max)}…` : str;
  }

  static initials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0]?.toUpperCase() ?? '')
      .join('');
  }

  static slug(str: string): string {
    return str
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
}
