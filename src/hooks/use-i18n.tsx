"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode, useTransition } from "react";
import { translations, LANGUAGE_CONFIG, type Direction, type Locale, type Translations, TranslationKeys } from "@/lib/i18n/i18n-core";
import { clientCookieManager, clientStorageManager, ClientTranslator } from "@/lib/i18n/i18n-client";
import { saveLocaleToDatabase, setLocaleAction } from "@/lib/i18n/i18n-server";

interface I18nContextValue {
  locale: Locale;
  direction: Direction;
  isRTL: boolean;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: TranslationKeys, fallback?: string) => string;
  exists: (key: TranslationKeys) => boolean;
  config: (typeof LANGUAGE_CONFIG)[Locale];
  availableLocales: readonly Locale[];
  isPending: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  initialLocale: Locale;
  userId?: string;
}

export function I18nProvider({ children, initialLocale, userId }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [isPending, startTransition] = useTransition();

  const translator = useMemo(() => new ClientTranslator(translations[locale]), [locale]);

  const config = useMemo(() => LANGUAGE_CONFIG[locale], [locale]);
  const direction = config.direction;
  const isRTL = direction === "rtl";

  // Apply direction and lang to document
  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = config.htmlLang;
  }, [direction, config.htmlLang]);

  // Sync with localStorage on mount
  useEffect(() => {
    const storedLocale = clientStorageManager.get();
    const cookieLocale = clientCookieManager.get();

    if (cookieLocale && cookieLocale !== storedLocale) {
      clientStorageManager.set(cookieLocale);
    }
  }, []);

  const setLocale = useCallback(
    async (newLocale: Locale) => {
      if (newLocale === locale) return;

      // Optimistic update
      setLocaleState(newLocale);

      // Update client-side storage immediately
      clientCookieManager.set(newLocale);
      clientStorageManager.set(newLocale);

      // Update server-side with transition
      startTransition(async () => {
        try {
          // Set cookie via server action
          const result = await setLocaleAction(newLocale);

          if (!result.success) {
            console.error("Failed to set locale:", result.error);
            // Revert on error
            setLocaleState(locale);
            return;
          }

          // Optional: Save to database
          if (userId) {
            saveLocaleToDatabase(Number(userId), newLocale).catch(error => {
              console.error("Failed to save locale to database:", error);
            });
          }
        } catch (error) {
          console.error("Error setting locale:", error);
          // Revert on error
          setLocaleState(locale);
        }
      });
    },
    [locale, userId]
  );

  const t = useCallback((key: TranslationKeys, fallback?: string) => translator.t(key, fallback), [translator]);

  const exists = useCallback((key: TranslationKeys) => translator.exists(key), [translator]);

  const value: I18nContextValue = useMemo(
    () => ({
      locale,
      direction,
      isRTL,
      setLocale,
      t,
      exists,
      config,
      availableLocales: Object.keys(translations) as Locale[],
      isPending,
    }),
    [locale, direction, isRTL, setLocale, t, exists, config, isPending]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);

  if (!ctx) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }

  const { locale, direction, isRTL, setLocale, t, exists, config, availableLocales, isPending } = ctx;

  return {
    locale,
    direction,
    isRTL,
    setLocale,
    t: (key: TranslationKeys, fallback?: string) => t(key, fallback),
    exists: (key: TranslationKeys) => exists(key),
    config,
    availableLocales,
    isPending,
  };
}
