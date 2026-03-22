'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

import {
  type Locale,
  type Direction,
  type TranslationKeys,
  type LanguageConfig,
  DEFAULT_LOCALE,
  LANGUAGE_CONFIG,
  AVAILABLE_LOCALES,
  loadLocale,
  translate,
  keyExists,
} from '@/i18n/config';
import { saveLocaleToDatabase, setLocaleAction } from '@/i18n/i18n.action';

// ─── Context ──────────────────────────────────────────────────────────────────

interface I18nContextValue {
  locale: Locale;
  direction: Direction;
  isRTL: boolean;
  config: LanguageConfig;
  availableLocales: readonly Locale[];
  /** True while the server action (cookie + revalidation) is in-flight. */
  isPending: boolean;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: TranslationKeys, fallback?: string) => string;
  exists: (key: TranslationKeys) => boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface I18nProviderProps {
  children: ReactNode;
  /** Active locale resolved server-side; drives the initial render. */
  initialLocale?: Locale;
  /**
   * Pre-loaded dictionary from the server.
   * Pass this so t() works on the very first render with no async gap.
   * When omitted (client-only usage) the bundle is fetched on mount.
   */
  initialDict?: Record<string, unknown>;
  /** When provided, the chosen locale is also persisted to the database. */
  userId?: string;
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  initialDict,
  userId,
}: I18nProviderProps) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dict, setDict] = useState<Record<string, unknown>>(initialDict ?? {});
  // Manual pending flag — tracks whether the server action is in-flight.
  // useTransition is intentionally NOT used here because startTransition
  // cannot wrap async work; wrapping an empty callback gives isPending=false
  // immediately, which defeats the purpose.
  const [isPending, setIsPending] = useState(false);

  // ── Server-prop synchronisation ───────────────────────────────────────────
  // When the server re-renders with a new locale (e.g. after revalidatePath),
  // it passes updated initialLocale + initialDict via props. We need to accept
  // them without running the full setLocale flow again.
  //
  // We compare against refs (not state) so this effect only fires when the
  // props genuinely change, not on every render.
  const prevInitialLocaleRef = useRef(initialLocale);
  const prevInitialDictRef = useRef(initialDict);

  useEffect(() => {
    const localeChanged = initialLocale !== prevInitialLocaleRef.current;
    const dictChanged = initialDict !== prevInitialDictRef.current;

    prevInitialLocaleRef.current = initialLocale;
    prevInitialDictRef.current = initialDict;

    if (initialDict && Object.keys(initialDict).length > 0) {
      // Server sent us a pre-loaded dict — use it directly.
      if (localeChanged) setLocaleState(initialLocale);
      if (dictChanged) setDict(initialDict);
    } else if (localeChanged) {
      // No server dict and the locale changed — load the bundle client-side.
      loadLocale(initialLocale)
        .then(setDict)
        .catch((err) =>
          console.error('[i18n] Failed to load initial locale bundle:', err),
        );
      setLocaleState(initialLocale);
    }
  }, [initialLocale, initialDict]);

  // ── Initial client-side load (no initialDict provided at all) ─────────────
  useEffect(() => {
    if (!initialDict || Object.keys(initialDict).length === 0) {
      loadLocale(initialLocale)
        .then(setDict)
        .catch((err) =>
          console.error('[i18n] Failed to load locale bundle on mount:', err),
        );
    }
    // Only runs once on mount — intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Document direction + lang ─────────────────────────────────────────────
  const config = LANGUAGE_CONFIG[locale];

  useEffect(() => {
    document.documentElement.dir = config.direction;
    document.documentElement.lang = config.htmlLang;
  }, [config]);

  // ── In-flight cancellation ────────────────────────────────────────────────
  // A ref-based token lets us discard stale responses when setLocale is
  // called again before the previous call has finished.
  const switchTokenRef = useRef<symbol>(Symbol());

  // ── setLocale ─────────────────────────────────────────────────────────────
  const setLocale = useCallback(
    async (newLocale: Locale) => {
      if (newLocale === locale) return;

      // Snapshot for rollback.
      const prevLocale = locale;
      const prevDict = dict;

      // Issue a fresh token; any pending call holding an old token will bail.
      const token = Symbol();
      switchTokenRef.current = token;
      const isCurrent = () => switchTokenRef.current === token;

      // ── 1. Optimistic UI update ──────────────────────────────────────────
      setLocaleState(newLocale);
      setIsPending(true);

      // ── 2. Load the locale bundle in parallel with the server action ─────
      let newDict: Record<string, unknown>;
      try {
        newDict = await loadLocale(newLocale);
      } catch (err) {
        console.error('[i18n] Failed to load locale bundle:', err);
        if (isCurrent()) {
          setLocaleState(prevLocale);
          setIsPending(false);
        }
        return;
      }

      if (!isCurrent()) return; // Superseded by a newer call — discard.
      setDict(newDict);

      // ── 3. Sync with the server (cookie + cache invalidation) ────────────
      // The server is the single writer of the locale cookie (HttpOnly),
      // so we never touch document.cookie here.
      try {
        const result = await setLocaleAction(newLocale);

        if (!isCurrent()) return;

        if (!result.success) {
          console.error(
            '[i18n] Server failed to set locale cookie:',
            result.error,
          );
          setLocaleState(prevLocale);
          setDict(prevDict);
          setIsPending(false);
          return;
        }

        // ── 4. Optionally persist to the database (non-fatal) ──────────────
        // if (userId) {
        //   const dbResult = await saveLocaleToDatabase(userId, newLocale);
        //   if (!dbResult.success) {
        //     // Non-fatal: cookie is already set. Log and continue.
        //     console.error(
        //       "[i18n] Failed to persist locale to DB:",
        //       dbResult.error,
        //     );
        //   }
        // }
      } catch (err) {
        console.error('[i18n] Error syncing locale with server:', err);
        if (isCurrent()) {
          setLocaleState(prevLocale);
          setDict(prevDict);
        }
      } finally {
        if (isCurrent()) setIsPending(false);
      }
    },
    [locale, dict, userId],
  );

  // ── Context value ─────────────────────────────────────────────────────────
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      direction: config.direction,
      isRTL: config.direction === 'rtl',
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
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
