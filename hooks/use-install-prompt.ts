"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type BeforeInstallPromptEvent,
  INSTALL_DISMISS_KEY,
  INSTALL_DISMISS_TTL_MS,
  isIOS,
  isStandalone,
} from "@/lib/pwa";

type Platform = "chromium" | "ios" | "unsupported";

/**
 * Tracks the browser's "add to home screen" affordance.
 *
 * Chromium fires `beforeinstallprompt` and lets us show a real install
 * button. iOS Safari has no such event — the only way to install is the
 * Share → "Add to Home Screen" flow, so we surface instructions instead.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>("unsupported");
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  // Read the dismissal flag on mount (localStorage is not available during SSR).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(INSTALL_DISMISS_KEY);
      if (!raw) {
        setDismissed(false);
        return;
      }

      const dismissedAt = Number(raw);
      const expired = Date.now() - dismissedAt > INSTALL_DISMISS_TTL_MS;
      setDismissed(!expired || Number.isNaN(dismissedAt));
    } catch {
      // Private mode / disabled storage: show the prompt.
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      setPlatform("unsupported");
      return;
    }

    setPlatform(isIOS() ? "ios" : "chromium");

    const onBeforeInstallPrompt = (event: Event) => {
      // Suppress the browser's own mini-infobar, we render our own banner.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (outcome === "accepted") {
      setInstalled(true);
      dismiss();
    }

    return outcome === "accepted";
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
    } catch {
      // Storage unavailable — the banner simply reappears next session.
    }
  }, []);

  /**
   * The banner is shown when the browser supports installation and the user
   * has not dismissed it. On Chromium we additionally wait for the actual
   * `beforeinstallprompt` event so we never advertise an install that the
   * browser would refuse.
   */
  const canInstall = !installed && !dismissed && platform !== "unsupported";
  const showBanner =
    canInstall && (platform === "ios" || deferredPrompt !== null);

  return { canInstall, showBanner, install, dismiss, installed, platform };
}
