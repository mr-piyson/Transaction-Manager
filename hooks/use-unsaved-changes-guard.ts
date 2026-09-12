"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

/**
 * Warns users before they lose unsaved form data:
 * - native `beforeunload` while the form is dirty and not submitting
 * - intercepts in-app navigation away from the page (closest <a> click)
 */
export function useUnsavedChangesGuard(
  isDirty: boolean,
  isPending: boolean,
  warningKey = "invoices.unsavedChangesWarning",
) {
  const t = useTranslations();

  React.useEffect(() => {
    if (!isDirty || isPending) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, isPending]);

  React.useEffect(() => {
    if (!isDirty || isPending) return;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest(
        "a",
      ) as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (!window.confirm(t(warningKey as Parameters<typeof t>[0]))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isDirty, isPending, t, warningKey]);
}
