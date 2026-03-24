// ============================================
// FILE: src/lib/i18n/config.ts
//
// Single source of truth for all shared i18n types, constants,
// and pure utility functions. Import from here — never duplicate.
// ============================================

// ─── Locale registry ─────────────────────────────────────────────────────────
// To add a new language:
//   1. Add its key here.
//   2. Create the matching locale file in src/lib/i18n/locales/<key>.ts
//   3. Add a case to loadLocale() below.
//   That's it — everything else picks it up automatically.

export type Locale = 'en' | 'ar';

export const DEFAULT_LOCALE: Locale = 'en';
export const COOKIE_NAME = 'app_locale';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// ─── Language metadata ────────────────────────────────────────────────────────

export type Direction = 'ltr' | 'rtl';

export interface LanguageConfig {
  name: string;
  nativeName: string;
  direction: Direction;
  htmlLang: string;
}

export const LANGUAGE_CONFIG: Record<Locale, LanguageConfig> = {
  en: {
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    htmlLang: 'en',
  },
  ar: {
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    htmlLang: 'ar',
  },
};

export const AVAILABLE_LOCALES = Object.keys(LANGUAGE_CONFIG) as Locale[];

// ─── Runtime locale guard ─────────────────────────────────────────────────────
// Narrows an unknown string (e.g. from a cookie or URL param) to a typed
// Locale, falling back to DEFAULT_LOCALE when the value is absent or invalid.
// Use this at every trust boundary instead of casting with `as Locale`.

export function parseLocale(value: string | null | undefined): Locale {
  if (value && (AVAILABLE_LOCALES as string[]).includes(value)) {
    return value as Locale;
  }
  return DEFAULT_LOCALE;
}

// ─── Dynamic locale loader ────────────────────────────────────────────────────
// The ONE place where locale files are referenced.
// Webpack/Turbopack will code-split each locale into its own chunk.
// The client receives only the chunk for the active locale.

export async function loadLocale(locale: Locale): Promise<Record<string, unknown>> {
  switch (locale) {
    case 'en':
      return (await import('./locales/en')).en as Record<string, unknown>;
    case 'ar':
      return (await import('./locales/ar')).ar as Record<string, unknown>;
    // No `default` branch — TypeScript will emit a compile error if you add a
    // new Locale without a matching case here, keeping the switch exhaustive.
  }
}

// ─── Translation types ────────────────────────────────────────────────────────
// Derived from the English locale (the canonical shape).

import type { en } from './locales/en';

export type Translations = typeof en;

type PrefixedKeys<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? P extends ''
      ? K
      : `${P}.${K}`
    : PrefixedKeys<T[K], P extends '' ? K : `${P}.${K}`>;
}[keyof T & string];

export type TranslationKeys = PrefixedKeys<Translations>;

// ─── Pure translation utilities ───────────────────────────────────────────────

// Typed traversal — avoids `any` while still walking an arbitrary nested record.
function deepGet(obj: Record<string, unknown>, keys: string[]): unknown {
  let current: unknown = obj;
  for (const k of keys) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[k];
  }
  return current;
}

export function translate(
  dict: Record<string, unknown>,
  key: TranslationKeys,
  fallback?: string,
): string {
  const value = deepGet(dict, key.split('.'));
  return typeof value === 'string' ? value : (fallback ?? key);
}

export function keyExists(dict: Record<string, unknown>, key: TranslationKeys): boolean {
  return typeof deepGet(dict, key.split('.')) === 'string';
}
