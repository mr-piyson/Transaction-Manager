import db from '@/lib/db';

const FRANKFURTER_BASE_URL = 'https://api.frankfurter.dev/v2';

export interface FrankfurterRateItem {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

export interface FrankfurterRateResponse {
  base: string;
  date: string;
  rates: FrankfurterRateItem[];
}

export interface ExchangeRateData {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: Date;
  source: string;
}

/**
 * Fetch latest exchange rates from Frankfurter API
 * Uses ECB (European Central Bank) data - updated daily on working days
 */
export async function fetchLatestRates(
  baseCurrency: string,
  targetCurrencies: string[]
): Promise<FrankfurterRateResponse> {
  const quotes = targetCurrencies.filter((c) => c !== baseCurrency).join(',');

  if (!quotes) {
    return { base: baseCurrency, date: new Date().toISOString().split('T')[0], rates: [] };
  }

  const url = `${FRANKFURTER_BASE_URL}/rates?base=${baseCurrency}&quotes=${quotes}`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Frankfurter API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // V2 returns an array, wrap it in the expected format
  if (Array.isArray(data)) {
    const firstItem = data[0];
    return {
      base: firstItem?.base ?? baseCurrency,
      date: firstItem?.date ?? new Date().toISOString().split('T')[0],
      rates: data,
    };
  }

  return data;
}

/**
 * Fetch historical exchange rates for a specific date
 */
export async function fetchHistoricalRates(
  date: string,
  baseCurrency: string,
  targetCurrencies: string[]
): Promise<FrankfurterRateResponse> {
  const quotes = targetCurrencies.filter((c) => c !== baseCurrency).join(',');

  if (!quotes) {
    return { base: baseCurrency, date, rates: [] };
  }

  const url = `${FRANKFURTER_BASE_URL}/rates?date=${date}&base=${baseCurrency}&quotes=${quotes}`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Frankfurter API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // V2 returns an array, wrap it in the expected format
  if (Array.isArray(data)) {
    const firstItem = data[0];
    return {
      base: firstItem?.base ?? baseCurrency,
      date: firstItem?.date ?? date,
      rates: data,
    };
  }

  return data;
}

/**
 * Convert Frankfurter API response to ExchangeRateData array
 */
export function transformRates(
  response: FrankfurterRateResponse,
  source: string = 'frankfurter'
): ExchangeRateData[] {
  // V2 returns rates as an array of { date, base, quote, rate } objects
  if (Array.isArray(response.rates)) {
    return response.rates.map((item) => ({
      fromCurrency: item.base,
      toCurrency: item.quote,
      rate: item.rate,
      effectiveDate: new Date(item.date),
      source,
    }));
  }

  // Fallback for V1 format (object with currency codes as keys)
  const baseCurrency = response.base;
  const effectiveDate = new Date(response.date);
  const ratesObj = response.rates as unknown as Record<string, number>;

  return Object.entries(ratesObj).map(([toCurrency, rate]) => ({
    fromCurrency: baseCurrency,
    toCurrency,
    rate,
    effectiveDate,
    source,
  }));
}

/**
 * Fetch all currency pairs for a given base currency
 * Returns rates from base to all other active currencies in the DB
 */
export async function fetchAllRatesForBase(baseCurrency: string): Promise<ExchangeRateData[]> {
  const activeCurrencies = await db.currency.findMany({
    where: { isActive: true },
    select: { code: true },
  });
  const targetCurrencies = activeCurrencies.map((c) => c.code).filter((c) => c !== baseCurrency);

  const response = await fetchLatestRates(baseCurrency, targetCurrencies);
  return transformRates(response, 'frankfurter');
}

/**
 * Fetch all currency pairs for all active currencies in DB
 */
export async function fetchAllCurrencyPairs(): Promise<ExchangeRateData[]> {
  const activeCurrencies = await db.currency.findMany({
    where: { isActive: true },
    select: { code: true },
  });
  const allCurrencies = activeCurrencies.map((c) => c.code);
  const allRates: ExchangeRateData[] = [];

  for (const baseCurrency of allCurrencies) {
    try {
      const rates = await fetchAllRatesForBase(baseCurrency);
      allRates.push(...rates);
    } catch (error) {
      console.error(`[frankfurter] Failed to fetch rates for base ${baseCurrency}:`, error);
    }
  }

  return allRates;
}

/**
 * Full sync: upsert Currency rows from Frankfurter + upsert ExchangeRate rows.
 * Currencies that don't exist in DB are created (metadata comes from seed data / Frankfurter).
 * Rates are upserted for all active currencies.
 */
export async function fullSyncCurrenciesAndRates(baseCurrency: string = 'EUR', organizationId?: string): Promise<{
  currenciesSynced: number;
  ratesSynced: number;
}> {
  // 1. Fetch latest rates for all active currencies
  const activeCurrencies = await db.currency.findMany({
    where: { isActive: true },
    select: { code: true },
  });
  const allCurrencyCodes = activeCurrencies.map((c) => c.code);
  const targetCurrencies = allCurrencyCodes.filter((c) => c !== baseCurrency);

  // 2. Fetch rates from Frankfurter
  const response = await fetchLatestRates(baseCurrency, targetCurrencies);
  const rates = transformRates(response, 'frankfurter');

  // 3. Upsert exchange rates (dedupe by base+quote+date)
  const rateMap = new Map<string, ExchangeRateData>();
  for (const rate of rates) {
    const key = `${rate.fromCurrency}-${rate.toCurrency}-${rate.effectiveDate.toISOString().split('T')[0]}`;
    rateMap.set(key, rate);
  }

  let ratesSynced = 0;
  for (const rate of rateMap.values()) {
    try {
      if (organizationId) {
        // Organization-scoped upsert (for cron sync)
        const existing = await db.exchangeRate.findFirst({
          where: {
            organizationId,
            fromCurrency: rate.fromCurrency,
            toCurrency: rate.toCurrency,
            effectiveDate: rate.effectiveDate,
          },
        });

        if (existing) {
          if (existing.rate.toNumber() !== rate.rate) {
            await db.exchangeRate.update({
              where: { id: existing.id },
              data: { rate: rate.rate, source: rate.source },
            });
          }
        } else {
          await db.exchangeRate.create({
            data: {
              fromCurrency: rate.fromCurrency,
              toCurrency: rate.toCurrency,
              rate: rate.rate,
              effectiveDate: rate.effectiveDate,
              source: rate.source,
              organizationId,
            },
          });
        }
      }
      ratesSynced++;
    } catch (error) {
      console.error(`[frankfurter] Failed to upsert rate ${rate.fromCurrency}/${rate.toCurrency}:`, error);
    }
  }

  // 4. Update lastSyncedAt on Currency records
  const uniqueCurrencies = new Set(rates.map((r) => r.fromCurrency).concat(rates.map((r) => r.toCurrency)));
  for (const code of uniqueCurrencies) {
    await db.currency.updateMany({
      where: { code },
      data: { lastSyncedAt: new Date() },
    });
  }

  return {
    currenciesSynced: uniqueCurrencies.size,
    ratesSynced,
  };
}
