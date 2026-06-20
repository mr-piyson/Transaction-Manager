'use client';

import { createContext, useContext, useMemo } from 'react';
import { CURRENCIES, formatAmount as fmtAmount, type CurrencyCode } from '@/lib/utils';
import { trpc } from '@/lib/trpc/client';

interface CurrencyContextValue {
  currency: CurrencyCode;
  symbol: string;
  precision: number;
  label: string;
  format: (amount: number | string | null | undefined) => string;
  currencies: typeof CURRENCIES;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { data: org } = trpc.settings.getOrg.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const value = useMemo<CurrencyContextValue>(() => {
    const code = (org?.currency ?? 'BHD') as CurrencyCode;
    const config = CURRENCIES[code] ?? CURRENCIES.BHD;
    return {
      currency: code,
      symbol: config.symbol,
      precision: config.precision,
      label: config.label,
      format: (amount) => fmtAmount(amount, code),
      currencies: CURRENCIES,
    };
  }, [org?.currency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used within a <CurrencyProvider />');
  }
  return ctx;
}
