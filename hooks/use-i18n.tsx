"use client";

// ============================================
// FILE: src/hooks/useI18n.tsx
//
// Setup (app/layout.tsx — Server Component):
//   const { locale, dict } = await useServerI18n();
//   <I18nProvider initialLocale={locale} initialDict={dict}> ... </I18nProvider>
//
// Usage in any Client Component:
//   const { t, locale, setLocale, isRTL } = useI18n();
// ============================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useTransition,
  type ReactNode,
} from "react";

import {
  type Locale,
  type Direction,
  type TranslationKeys,
  type LanguageConfig,
  DEFAULT_LOCALE,
  COOKIE_NAME,
  COOKIE_MAX_AGE,
  LANGUAGE_CONFIG,
  AVAILABLE_LOCALES,
  loadLocale,
  translate,
  keyExists,
} from "@/i18n/config";

import { setLocaleAction, saveLocaleToDatabase } from "@/hooks/use-server-i18n";

// ─── Cookie / storage helpers ─────────────────────────────────────────────────

const STORAGE_KEY = "app_locale";

const cookieManager = {
  get: (): Locale | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie
      .split(";")
      .find((c) => c.trim().startsWith(`${COOKIE_NAME}=`));
    return (match?.split("=")[1]?.trim() as Locale) ?? null;
  },
  set: (locale: Locale): void => {
    if (typeof document === "undefined") return;
    const expires = new Date(Date.now() + COOKIE_MAX_AGE * 1000).toUTCString();
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_NAME}=${locale}; expires=${expires}; path=/; SameSite=Lax${secure}`;
  },
};

const storageManager = {
  get: (): Locale | null => {
    try {
      return localStorage.getItem(STORAGE_KEY) as Locale | null;
    } catch {
      return null;
    }
  },
  set: (locale: Locale): void => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {}
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface I18nContextValue {
  locale: Locale;
  direction: Direction;
  isRTL: boolean;
  config: LanguageConfig;
  availableLocales: Locale[];
  isPending: boolean;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: TranslationKeys, fallback?: string) => string;
  exists: (key: TranslationKeys) => boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
  /** Pre-loaded dictionary from the server — avoids a client-side fetch on first render */
  initialDict?: Record<string, unknown>;
  userId?: string;
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  initialDict,
  userId,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dict, setDict] = useState<Record<string, unknown>>(initialDict ?? {});
  const [isPending, startTransition] = useTransition();

  const config = LANGUAGE_CONFIG[locale];

  // Sync document direction + lang attribute
  useEffect(() => {
    document.documentElement.dir = config.direction;
    document.documentElement.lang = config.htmlLang;
  }, [config]);

  // Sync localStorage with cookie on mount
  useEffect(() => {
    const cookieLocale = cookieManager.get();
    if (cookieLocale) storageManager.set(cookieLocale);
  }, []);

  const setLocale = useCallback(
    async (newLocale: Locale) => {
      if (newLocale === locale) return;

      // Optimistic UI: update locale state immediately
      setLocaleState(newLocale);

      // Dynamically load ONLY the new locale's bundle — no other locale is fetched
      const newDict = await loadLocale(newLocale);
      setDict(newDict);

      cookieManager.set(newLocale);
      storageManager.set(newLocale);

      startTransition(async () => {
        try {
          const result = await setLocaleAction(newLocale);
          if (!result.success) {
            console.error("Failed to set locale:", result.error);
            // Revert both locale and dict on failure
            setLocaleState(locale);
            setDict(dict);
            return;
          }
          if (userId) {
            saveLocaleToDatabase(Number(userId), newLocale).catch(
              console.error,
            );
          }
        } catch (err) {
          console.error("Error setting locale:", err);
          setLocaleState(locale);
          setDict(dict);
        }
      });
    },
    [locale, dict, userId],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      direction: config.direction,
      isRTL: config.direction === "rtl",
      config,
      availableLocales: AVAILABLE_LOCALES,
      isPending,
      setLocale,
      t: (key, fallback) => translate(dict, key, fallback),
      exists: (key) => keyExists(dict, key),
    }),
    [locale, config, dict, isPending, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
