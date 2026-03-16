// Create a Type out of the keys (e.g., "USD" | "EUR" | "JPY" | "BHD")

export type CurrencyCode = keyof typeof CURRENCIES;

export const CURRENCIES = {
  USD: {
    code: 'USD',
    symbol: '$',
    label: 'US Dollar',
    precision: 2,
    separator: ',',
    decimal: '.',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    label: 'Euro',
    precision: 2,
    separator: '.',
    decimal: ',',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    label: 'Japanese Yen',
    precision: 0,
    separator: ',',
    decimal: '.',
  },
  BHD: {
    code: 'BHD',
    symbol: 'BD',
    label: 'Bahraini Dinar',
    precision: 3,
    separator: ',',
    decimal: '.',
  },
} as const;
