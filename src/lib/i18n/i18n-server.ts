"use server";
// ============================================
// FILE: src/i18n/server/cookies.ts
// ============================================
import { cookies } from "next/headers";
import { COOKIE_MAX_AGE, COOKIE_NAME, DEFAULT_LOCALE, LANGUAGE_CONFIG, Locale, TranslationKeys, Translations, translations } from "./i18n-core";
import { revalidatePath } from "next/cache";
import { ServerTranslator } from "./i18n-classes";
import db from "../database";
import z from "zod";

export async function getLocaleFromCookie(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(COOKIE_NAME)?.value as Locale | undefined;

  if (locale && locale in translations) {
    return locale;
  }

  return DEFAULT_LOCALE;
}

export async function setLocaleCookie(locale: Locale): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, locale, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function deleteLocaleCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ============================================
// FILE: src/i18n/server/get-translator.ts
// ============================================

export async function getTranslator(locale?: Locale) {
  const currentLocale = locale || (await getLocaleFromCookie());
  return new ServerTranslator(translations["en"]);
}

// ============================================
// FILE: src/i18n/server/get-locale.ts
// ============================================

export async function getLocale() {
  const locale = await getLocaleFromCookie();
  const config = LANGUAGE_CONFIG[locale];

  return {
    locale,
    direction: config.direction,
    isRTL: config.direction === "rtl",
    config,
  };
}

// ============================================
// FILE: src/i18n/actions.ts
// ============================================

export async function setLocaleAction(locale: Locale): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate locale
    if (!(locale in translations)) {
      return { success: false, error: "Invalid locale" };
    }

    // Set cookie
    await setLocaleCookie(locale);
    // const user = await Auth.getCurrentUser();

    // Optional: Save to database
    // if (user?.userId) {
    //   await saveLocaleToDatabase(user.userId, locale);
    // }

    // Revalidate all paths to apply new locale
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("Error setting locale:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Optional: Server action to save to database
export async function saveLocaleToDatabase(userId: number, locale: Locale): Promise<{ success: boolean; error?: string }> {
  try {
    const userIdNumber = z.coerce.number().safeParse(userId);
    if (!userIdNumber.success) return { success: false, error: "Invalid userId" };
    await db.users.update({
      where: { id: Number(userId) },
      data: { locale },
    });

    return { success: true };
  } catch (error) {
    console.error("Error saving locale to database:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
