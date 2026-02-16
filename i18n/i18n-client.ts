// ============================================
// FILE: src/i18n/client/cookies.ts
// ============================================
"use client";

import { COOKIE_MAX_AGE, COOKIE_NAME, Locale } from "./i18n-core";
import { TranslationKeys } from "./i18n-core";

export const clientCookieManager = {
  get: (): Locale | null => {
    if (typeof document === "undefined") return null;

    const cookies = document.cookie.split(";");
    const localeCookie = cookies.find(cookie => cookie.trim().startsWith(`${COOKIE_NAME}=`));

    if (!localeCookie) return null;

    const value = localeCookie.split("=")[1]?.trim();
    return value as Locale;
  },

  set: (locale: Locale): void => {
    if (typeof document === "undefined") return;

    const expires = new Date();
    expires.setTime(expires.getTime() + COOKIE_MAX_AGE * 1000);

    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_NAME}=${locale}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secure}`;
  },
};

// ============================================
// FILE: src/i18n/client/storage.ts
// ============================================

const STORAGE_KEY = "app_locale";

export const clientStorageManager = {
  get: (): Locale | null => {
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored as Locale | null;
    } catch {
      return null;
    }
  },

  set: (locale: Locale): void => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch (error) {
      console.warn("Failed to save locale to localStorage:", error);
    }
  },

  delete: (): void => {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to remove locale from localStorage:", error);
    }
  },
};

// ============================================
// FILE: src/i18n/client/translator.ts
// ============================================

export class ClientTranslator {
  private translations: any;

  constructor(translations: any) {
    this.translations = translations;
  }

  t(key: TranslationKeys, fallback?: string): string {
    const keys = key.split(".");
    let value: any = this.translations;

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }

    return typeof value === "string" ? value : fallback || key;
  }

  exists(key: TranslationKeys): boolean {
    const keys = key.split(".");
    let value: any = this.translations;

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return false;
      }
    }

    return typeof value === "string";
  }
}
