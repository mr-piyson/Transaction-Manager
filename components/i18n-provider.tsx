'use client';

import { NextIntlClientProvider } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { getInitialLocale, type Locale } from '@/hooks/use-locale';
import enMessages from '../messages/en.json';
import arMessages from '../messages/ar.json';

const allMessages = { en: enMessages, ar: arMessages } as const;

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale] = useState<Locale>(getInitialLocale);
  const messages = allMessages[locale];

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Baghdad">
      {children}
    </NextIntlClientProvider>
  );
}
