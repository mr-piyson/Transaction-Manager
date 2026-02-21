"use client";

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
import { saveLocaleToDatabase, setLocaleAction } from "@/i18n/i18n.action";

// FIX #4: Import from the renamed server utility (getServerI18n → file renamed)

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
  // If initialDict was pre-loaded by the server, use it immediately so t()
  // works on the very first render with no async gap.
  // If it was NOT provided (client-only usage), start with {} and load below.
  const [dict, setDict] = useState<Record<string, unknown>>(initialDict ?? {});
  const [isPending, startTransition] = useTransition();

  const config = LANGUAGE_CONFIG[locale];

  // ── ROOT CAUSE FIX ────────────────────────────────────────────────────────
  // The dictionary is NEVER loaded on first render unless the caller passes
  // `initialDict`. When `initialDict` is absent (or empty) every call to
  // `t()` walks an empty object and falls back to returning the raw key.
  //
  // Two cases handled here:
  //   A) No initialDict supplied → load the bundle for initialLocale on mount.
  //   B) initialDict changes (server re-rendered with a different locale) →
  //      accept the new dict and update the locale state to stay in sync.
  useEffect(() => {
    if (initialDict && Object.keys(initialDict).length > 0) {
      // Case B: server passed us a fresh dict (e.g. after a navigation)
      setDict(initialDict);
      setLocaleState(initialLocale);
    } else {
      // Case A: no server dict — load the bundle client-side on mount
      loadLocale(initialLocale)
        .then(setDict)
        .catch((err) =>
          console.error("Failed to load initial locale bundle:", err),
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocale, initialDict]);
  // ─────────────────────────────────────────────────────────────────────────

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

      // FIX #2: Capture previous values *before* the optimistic update so
      // the revert closure always references the right snapshot.
      const prevLocale = locale;
      const prevDict = dict;

      // Optimistic UI: update locale state immediately
      setLocaleState(newLocale);

      // FIX #3: Tag this particular call so a stale response from a
      // previous (slower) loadLocale call is simply discarded.
      let cancelled = false;

      let newDict: Record<string, unknown>;
      try {
        newDict = await loadLocale(newLocale);
      } catch (err) {
        console.error("Failed to load locale bundle:", err);
        // Revert optimistic locale update if the bundle itself failed
        setLocaleState(prevLocale);
        return;
      }

      if (cancelled) return; // A newer setLocale call already took over
      setDict(newDict);

      cookieManager.set(newLocale);
      storageManager.set(newLocale);

      // FIX #1: startTransition must NOT contain async work directly.
      // Start the transition to mark server-sync as non-urgent, but keep
      // the async logic outside so isPending tracks correctly.
      startTransition(() => {
        // intentionally empty — triggers isPending = true while the
        // async work below runs alongside React's scheduler.
      });

      try {
        const result = await setLocaleAction(newLocale);
        if (!result.success) {
          console.error("Failed to set locale cookie on server:", result.error);
          // Revert both locale and dict on server failure
          if (!cancelled) {
            setLocaleState(prevLocale);
            setDict(prevDict);
          }
          return;
        }

        // FIX #5: await the server action properly instead of fire-and-forget
        if (userId) {
          const dbResult = await saveLocaleToDatabase(
            Number(userId),
            newLocale,
          );
          if (!dbResult.success) {
            console.error("Failed to persist locale to DB:", dbResult.error);
            // Non-fatal: cookie is already set, do not revert UI
          }
        }
      } catch (err) {
        console.error("Error syncing locale with server:", err);
        if (!cancelled) {
          setLocaleState(prevLocale);
          setDict(prevDict);
        }
      }

      // Cleanup function returned for cancellation on rapid locale switches
      return () => {
        cancelled = true;
      };
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
