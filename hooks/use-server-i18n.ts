"use server";

// ============================================
// FILE: src/hooks/useServerI18n.ts
//
// Usage in Server Components / Route Handlers:
//   const { t, locale, isRTL } = await useServerI18n();
//
// Usage in Server Actions:
//   await setLocaleAction("ar");
// ============================================

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import z from "zod";
import db from "@/lib/database";

import {
  type Locale,
  type TranslationKeys,
  DEFAULT_LOCALE,
  COOKIE_NAME,
  COOKIE_MAX_AGE,
  LANGUAGE_CONFIG,
  AVAILABLE_LOCALES,
  loadLocale,
  translate,
  keyExists,
} from "@/i18n/config";

// ─── Cookie helpers ───────────────────────────────────────────────────────────

async function getLocaleFromCookie(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value as Locale | undefined;
  return value && (AVAILABLE_LOCALES as string[]).includes(value)
    ? value
    : DEFAULT_LOCALE;
}

async function setLocaleCookie(locale: Locale): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, locale, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

// ─── Main hook ────────────────────────────────────────────────────────────────

/**
 * useServerI18n
 *
 * Use in React Server Components and Route Handlers.
 * Dynamically loads only the active locale's dictionary — no unused language
 * data is ever included in the server response.
 *
 * @example
 * const { t, locale, isRTL } = await useServerI18n();
 * const { t } = await useServerI18n("ar"); // pin a locale
 */
export async function useServerI18n(pinnedLocale?: Locale) {
  const locale = pinnedLocale ?? (await getLocaleFromCookie());
  const config = LANGUAGE_CONFIG[locale];
  const dict = await loadLocale(locale);

  return {
    t: (key: TranslationKeys, fallback?: string) =>
      translate(dict, key, fallback),
    exists: (key: TranslationKeys) => keyExists(dict, key),
    locale,
    direction: config.direction,
    isRTL: config.direction === "rtl",
    config,
    availableLocales: AVAILABLE_LOCALES,
  };
}

// ─── Server Actions ───────────────────────────────────────────────────────────

/**
 * setLocaleAction
 * Call from client components to switch the active locale.
 *
 * @example
 * await setLocaleAction("ar");
 */
export async function setLocaleAction(
  locale: Locale,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!(AVAILABLE_LOCALES as string[]).includes(locale)) {
      return { success: false, error: "Invalid locale" };
    }
    await setLocaleCookie(locale);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("Error setting locale:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * saveLocaleToDatabase
 * Persist the user's locale preference.
 */
export async function saveLocaleToDatabase(
  userId: number,
  locale: Locale,
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = z.coerce.number().safeParse(userId);
    if (!parsed.success) return { success: false, error: "Invalid userId" };

    await db.user.update({
      where: { id: parsed.data },
      data: { locale },
    });

    return { success: true };
  } catch (err) {
    console.error("Error saving locale to database:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
