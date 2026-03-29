// format.ts
import { CurrencyCode, Money } from './money';
import { Dates, DatesAgo, FormatKey } from './date';

export class Format {
  // ─── Money ────────────────────────────────────────────────────────────
  static currency(amount: number, curr: CurrencyCode = 'BHD'): string {
    return Money.format(Money.toInt(amount, curr), curr);
  }

  // ─── Dates ────────────────────────────────────────────────────────────
  static date(date: Date | string | number | null, type: FormatKey = 'iso'): string {
    return Dates(date, type);
  }

  /**
   * Relative time formatter (e.g., "about 2 hours ago")
   */
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

  // ─── Text ─────────────────────────────────────────────────────────────
  static truncate(str: string, max = 50): string {
    return str.length > max ? `${str.slice(0, max)}…` : str;
  }

  // ─── Initials ─────────────────────────────────────────────────────────
  /**
   * Get initials from a name. Format.initials('John Doe') → "JD"
   */
  static initials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0]?.toUpperCase() ?? '')
      .join('');
  }

  /**
   * Convert a string to a slug. Format.slug('John Doe') → "john-doe"
   */
  static slug(str: string): string {
    return str
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
}
