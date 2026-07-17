/**
 * Currency definitions — single source of truth.
 * Used by: prisma/seed.ts, setup.router.ts
 */

export interface CurrencyDefinition {
  code: string;
  name: string;
  symbol: string;
  precision: number;
}

export const CURRENCIES: readonly CurrencyDefinition[] = [
  // Major world currencies
  { code: 'USD', name: 'US Dollar', symbol: '$', precision: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', precision: 2 },
  { code: 'GBP', name: 'British Pound Sterling', symbol: '£', precision: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', precision: 0 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', precision: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', precision: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', precision: 2 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', precision: 2 },

  // Middle East
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD', precision: 3 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', precision: 2 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', precision: 2 },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', precision: 3 },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR', precision: 2 },
  { code: 'OMR', name: 'Omani Rial', symbol: '﷼', precision: 3 },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'JD', precision: 3 },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'L£', precision: 2 },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', precision: 2 },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د', precision: 2 },
  { code: 'IRR', name: 'Iranian Rial', symbol: '﷼', precision: 2 },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', precision: 2 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', precision: 2 },
  { code: 'YER', name: 'Yemeni Rial', symbol: '﷼', precision: 2 },
  { code: 'SYP', name: 'Syrian Pound', symbol: '£S', precision: 2 },

  // Asia Pacific
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', precision: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', precision: 2 },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', precision: 2 },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', precision: 2 },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', precision: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', precision: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', precision: 2 },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', precision: 0 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', precision: 2 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', precision: 2 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', precision: 2 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', precision: 2 },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', precision: 0 },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', precision: 2 },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'Rs', precision: 2 },
  { code: 'MVR', name: 'Maldivian Rufiyaa', symbol: 'Rf', precision: 2 },
  { code: 'AFN', name: 'Afghan Afghani', symbol: '؋', precision: 2 },

  // Europe
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', precision: 2 },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', precision: 2 },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', precision: 2 },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', precision: 2 },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', precision: 2 },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', precision: 2 },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', precision: 2 },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', precision: 2 },
  { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn', precision: 2 },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'din', precision: 2 },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', precision: 2 },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', precision: 2 },

  // Americas
  { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$', precision: 2 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', precision: 2 },
  { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$', precision: 2 },
  { code: 'CLP', name: 'Chilean Peso', symbol: 'CL$', precision: 0 },
  { code: 'COP', name: 'Colombian Peso', symbol: 'CO$', precision: 2 },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', precision: 2 },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U', precision: 2 },
  { code: 'VES', name: 'Venezuelan Bolivar', symbol: 'Bs', precision: 2 },

  // Africa
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', precision: 2 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', precision: 2 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', precision: 2 },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', precision: 2 },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD', precision: 2 },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'DA', precision: 2 },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'DT', precision: 3 },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', precision: 2 },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', precision: 2 },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', precision: 0 },
  { code: 'XOF', name: 'CFA Franc (West)', symbol: 'CFA', precision: 0 },
  { code: 'XAF', name: 'CFA Franc (Central)', symbol: 'FCFA', precision: 0 },
] as const;
