// ============================================
// FILE: src/i18n/server/translator.ts
// ============================================

import { TranslationKeys, Translations } from "./i18n-core";

export class ServerTranslator {
  private translations: Translations;

  constructor(translations: Translations) {
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
