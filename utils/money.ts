import { Decimal } from "decimal.js";

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export class MoneyUtil {
  /**
   * Add two monetary values with precision
   */
  static add(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a).plus(new Decimal(b));
  }

  /**
   * Subtract two monetary values with precision
   */
  static subtract(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a).minus(new Decimal(b));
  }

  /**
   * Multiply monetary value with precision
   */
  static multiply(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a).times(new Decimal(b));
  }

  /**
   * Divide monetary value with precision
   */
  static divide(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return new Decimal(a).dividedBy(new Decimal(b));
  }

  /**
   * Calculate percentage
   */
  static percentage(amount: number | string | Decimal, percent: number | string | Decimal): Decimal {
    return new Decimal(amount).times(new Decimal(percent)).dividedBy(100);
  }

  /**
   * Round to 2 decimal places for currency
   */
  static round(amount: number | string | Decimal): Decimal {
    return new Decimal(amount).toDecimalPlaces(2);
  }

  /**
   * Format to currency string
   */
  static format(amount: number | string | Decimal, currency = "USD"): string {
    const value = new Decimal(amount).toNumber();
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(value);
  }

  /**
   * Calculate invoice total
   */
  static calculateInvoiceTotal(
    subtotal: number | string | Decimal,
    taxRate: number | string | Decimal,
    discount: number | string | Decimal = 0,
  ): {
    subtotal: Decimal;
    tax: Decimal;
    discount: Decimal;
    total: Decimal;
  } {
    const sub = new Decimal(subtotal);
    const disc = new Decimal(discount);
    const taxableAmount = sub.minus(disc);
    const tax = this.percentage(taxableAmount, taxRate);
    const total = taxableAmount.plus(tax);

    return {
      subtotal: this.round(sub),
      tax: this.round(tax),
      discount: this.round(disc),
      total: this.round(total),
    };
  }

  /**
   * Validate monetary amount
   */
  static isValid(amount: any): boolean {
    try {
      const decimal = new Decimal(amount);
      return decimal.isFinite() && !decimal.isNaN();
    } catch {
      return false;
    }
  }

  /**
   * Compare two amounts
   */
  static compare(a: number | string | Decimal, b: number | string | Decimal): number {
    return new Decimal(a).comparedTo(new Decimal(b));
  }

  /**
   * Check if amount is positive
   */
  static isPositive(amount: number | string | Decimal): boolean {
    return new Decimal(amount).isPositive();
  }

  /**
   * Check if amount is zero
   */
  static isZero(amount: number | string | Decimal): boolean {
    return new Decimal(amount).isZero();
  }
}
