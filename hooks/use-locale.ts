'use client';

import { useCallback, useEffect, useState } from 'react';

const LOCALE_COOKIE = 'NEXT_LOCALE';
const DEFAULT_LOCALE = 'en';
const SUPPORTED_LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
}

export function getInitialLocale(): Locale {
  const cookie = getCookie(LOCALE_COOKIE);
  if (cookie && SUPPORTED_LOCALES.includes(cookie as Locale)) return cookie as Locale;
  return DEFAULT_LOCALE;
}

export function useLocaleSwitcher() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    const current = getCookie(LOCALE_COOKIE);
    if (current && SUPPORTED_LOCALES.includes(current as Locale)) {
      setLocale(current as Locale);
    }
  }, []);

  const switchLocale = useCallback((newLocale: string) => {
    if (!SUPPORTED_LOCALES.includes(newLocale as Locale)) return;
    setCookie(LOCALE_COOKIE, newLocale);
    window.location.reload();
  }, []);

  return { locale, switchLocale };
}
