"use server";

// ============================================
// FILE: src/lib/i18n/i18n.action.ts
//
// Usage in Server Components / Route Handlers:
//   const { t, locale, isRTL } = await getServerI18n();
//
// Usage in Server Actions / Client Components:
//   await setLocaleAction("ar");
// ============================================

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
// import db from "@/lib/database"; // uncomment when DB integration is needed

import {
  type Locale,
  type TranslationKeys,
  COOKIE_NAME,
  COOKIE_MAX_AGE,
  LANGUAGE_CONFIG,
  AVAILABLE_LOCALES,
  loadLocale,
  translate,
  keyExists,
  parseLocale,
} from "@/i18n/config";

// ─── Cookie helpers ───────────────────────────────────────────────────────────

async function getLocaleFromCookie(): Promise<Locale> {
  const cookieStore = await cookies();
  // parseLocale handles validation + fallback — no unsafe cast needed.
  return parseLocale(cookieStore.get(COOKIE_NAME)?.value);
}

async function setLocaleCookie(locale: Locale): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, locale, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // HttpOnly keeps the cookie off document.cookie, preventing the client
    // from writing a conflicting value. The server is the single writer.
    httpOnly: true,
  });
}

// ─── Main server utility ──────────────────────────────────────────────────────

/**
 * CRITICAL WIRING — without this, t() always returns the raw key on the client.
 *
 * In your root layout (app/layout.tsx):
 *
 *   import { getServerI18n }  from "@/i18n/i18n.action";
 *   import { I18nProvider }   from "@/i18n/use-i18n";
 *
 *   export default async function RootLayout({ children }) {
 *     const { locale, dict } = await getServerI18n();
 *     return (
 *       <html>
 *         <body>
 *           <I18nProvider initialLocale={locale} initialDict={dict}>
 *             {children}
 *           </I18nProvider>
 *         </body>
 *       </html>
 *     );
 *   }
 *
 * @param pinnedLocale - Override the cookie; useful for preview/storybook.
 */
export async function getServerI18n(pinnedLocale?: Locale) {
  const locale = pinnedLocale ?? (await getLocaleFromCookie());
  const config = LANGUAGE_CONFIG[locale];
  const dict = await loadLocale(locale);

  return {
    t: (key: TranslationKeys, fallback?: string) =>
      translate(dict, key, fallback),
    exists: (key: TranslationKeys) => keyExists(dict, key),
    // ↓ Pass both of these to <I18nProvider initialLocale={locale} initialDict={dict}>
    locale,
    dict,
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
 * The server is the *only* cookie writer — the client never touches document.cookie.
 *
 * @example
 *   const result = await setLocaleAction("ar");
 *   if (!result.success) console.error(result.error);
 */
export async function setLocaleAction(
  locale: Locale,
): Promise<{ success: boolean; error?: string }> {
  // Validate at the trust boundary even though Locale is typed — Server Actions
  // can be called from untyped JS or external requests.
  if (!AVAILABLE_LOCALES.includes(locale)) {
    return { success: false, error: "Invalid locale" };
  }

  try {
    await setLocaleCookie(locale);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("[i18n] Error setting locale cookie:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * saveLocaleToDatabase
 * Persist the user's locale preference after the cookie has been set.
 * Non-fatal: a DB failure does NOT revert the cookie or the UI.
 *
 * TODO: uncomment the db call below once your schema includes a `locale` column.
 */
export async function saveLocaleToDatabase(
  userId: string | number,
  locale: Locale,
): Promise<{ success: boolean; error?: string }> {
  const parsed = z.coerce.number().int().positive().safeParse(userId);
  if (!parsed.success) {
    return { success: false, error: "Invalid userId" };
  }

  if (!AVAILABLE_LOCALES.includes(locale)) {
    return { success: false, error: "Invalid locale" };
  }

  try {
    // await db.user.update({
    //   where: { id: parsed.data },
    //   data: { locale },
    // });

    return { success: true };
  } catch (err) {
    console.error("[i18n] Error saving locale to database:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
