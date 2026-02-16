import { ar } from "./locales/ar";
import { en } from "./locales/en";

export const translations = {
  en,
  ar,
} as const;

export type Locale = keyof typeof translations;
export { en, ar };

// ============================================
// FILE: src/lib/i18n/config.ts
// ============================================

/**
 * type Direction = "ltr" | "rtl".
 * - "ltr" for left-to-right
 * - "rtl" for right-to-left
 */
export type Direction = "ltr" | "rtl";

export interface LanguageConfig {
  readonly name: string;
  readonly nativeName: string;
  readonly direction: Direction;
  readonly htmlLang: string;
}

export const LANGUAGE_CONFIG: Record<Locale, LanguageConfig> = {
  en: {
    name: "English",
    nativeName: "English",
    direction: "ltr",
    htmlLang: "en",
  },
  ar: {
    name: "Arabic",
    nativeName: "العربية",
    direction: "rtl",
    htmlLang: "ar",
  },
} as const;

export const DEFAULT_LOCALE: Locale = "en";
export const COOKIE_NAME = "app_locale";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * NestedKeyOf<T>
 *
 * Produces dot-joined union keys for nested objects.
 *
 * Example: "common.welcome" | "auth.login" | ...
 */
export type PrefixedNestedKeyOf<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? (P extends "" ? K : `${P}.${K}`) : PrefixedNestedKeyOf<T[K], P extends "" ? K : `${P}.${K}`>;
}[keyof T & string];

// Export the translation type and the dot-key union.
export type Translations = typeof en;
export type TranslationKeys = PrefixedNestedKeyOf<Translations>;
