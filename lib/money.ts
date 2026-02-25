import currency, { Options } from "currency.js";
import { CURRENCIES, CurrencyCode } from "./currency";

export class Money {
  private defaultCurrency: CurrencyCode = "BHD";

  static add(a: any, b: any, curr: CurrencyCode) {
    return currency(a, CURRENCIES[curr]).add(b);
  }

  static subtract(a: any, b: any, curr: CurrencyCode) {
    return currency(a, CURRENCIES[curr]).subtract(b);
  }

  static multiply(a: any, factor: number, curr: CurrencyCode) {
    return currency(a, CURRENCIES[curr]).multiply(factor);
  }

  static divide(a: any, divisor: number, curr: CurrencyCode) {
    return currency(a, CURRENCIES[curr]).distribute(divisor)[0];
    // .distribute is safer for splitting money without losing pennies
  }
  static format(amount: any, curr: CurrencyCode): string {
    return currency(amount, CURRENCIES[curr]).format();
  }
}
