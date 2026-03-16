import currency, { Options } from 'currency.js';
import { CURRENCIES, CurrencyCode } from './currency';

export class Money {
  static add(a: any, b: any, curr: CurrencyCode = 'BHD') {
    return currency(a, CURRENCIES[curr]).add(b);
  }

  static subtract(a: any, b: any, curr: CurrencyCode = 'BHD') {
    return currency(a, CURRENCIES[curr]).subtract(b);
  }

  static multiply(a: any, factor: number, curr: CurrencyCode = 'BHD') {
    return currency(a, CURRENCIES[curr]).multiply(factor);
  }

  static divide(a: any, divisor: number, curr: CurrencyCode = 'BHD') {
    return currency(a, CURRENCIES[curr]).distribute(divisor)[0];
    // .distribute is safer for splitting money without losing pennies
  }
  static format(amount: any, curr: CurrencyCode = 'BHD'): string {
    return currency(amount, CURRENCIES[curr]).format();
  }
}
