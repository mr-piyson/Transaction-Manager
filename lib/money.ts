// money.ts
import currency, { Options } from 'currency.js';
import { CURRENCIES, CurrencyCode } from './currency';

export class Money {
  /**
   * Helper to get the divisor based on precision.
   * For BHD (precision 3), it returns 1000.
   * For USD (precision 2), it returns 100.
   */
  private static getDivisor(curr: CurrencyCode): number {
    const precision = CURRENCIES[curr]?.precision || 2;
    return Math.pow(10, precision);
  }

  static add(a: number, b: number, curr: CurrencyCode = 'BHD') {
    const divisor = this.getDivisor(curr);
    return currency(a / divisor, CURRENCIES[curr]).add(b / divisor);
  }

  static subtract(a: number, b: number, curr: CurrencyCode = 'BHD') {
    const divisor = this.getDivisor(curr);
    return currency(a / divisor, CURRENCIES[curr]).subtract(b / divisor);
  }

  static multiply(a: number, factor: number, curr: CurrencyCode = 'BHD') {
    const divisor = this.getDivisor(curr);
    return currency(a / divisor, CURRENCIES[curr]).multiply(factor);
  }

  static divide(a: number, divisor: number, curr: CurrencyCode = 'BHD') {
    const unitDivisor = this.getDivisor(curr);
    return currency(a / unitDivisor, CURRENCIES[curr]).distribute(divisor)[0];
  }

  /**
   * Converts a decimal input to the integer stored in DB.
   * e.g. 1.5 (BHD, precision 3) → 1500
   *      1.50 (USD, precision 2) → 150
   *      100 (JPY, precision 0) → 100
   */
  static toInt(amount: number, curr: CurrencyCode = 'BHD'): number {
    const divisor = this.getDivisor(curr);
    return Math.round(amount * divisor);
  }

  static format(amount: number, curr: CurrencyCode = 'BHD'): string {
    const divisor = this.getDivisor(curr);
    // amount is the integer from DB (e.g., 1500)
    // 1500 / 1000 = 1.500
    return currency(amount / divisor, CURRENCIES[curr]).format();
  }
}
