// ============================================
// FILE: src/i18n/server/cookies.ts
// ============================================
import { cookies } from "next/headers";
import { COOKIE_NAME, COOKIE_MAX_AGE, DEFAULT_LOCALE } from "./i18n-core";
import { Locale, translations } from "./i18n-core";

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
