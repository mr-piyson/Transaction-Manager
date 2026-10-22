/**
 * Small helpers shared by the PWA components.
 *
 * Kept dependency-free on purpose so both the client components and the
 * server-side sign-out handler can use them.
 */

/** Path the service worker is served from. Its scope is the whole origin. */
export const SERVICE_WORKER_URL = "/sw.js";

/** Route the service worker serves when the network is unavailable. */
export const OFFLINE_URL = "/offline.html";

/** localStorage key holding the timestamp of the last install-banner dismiss. */
export const INSTALL_DISMISS_KEY = "tm:pwa-install-dismissed";

/** Re-show the install banner after this many days. */
export const INSTALL_DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Non-standard event Chromium fires before the install prompt. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function isServiceWorkerSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

/** True when the app runs in an installed (standalone) window. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari still uses the legacy prefix.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports a desktop UA but still exposes touch points.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Wipe every cache this app owns. Called on sign-out so nothing from the
 * previous session stays on the device.
 */
export async function clearServiceWorkerCaches(): Promise<void> {
  if (typeof window === "undefined") return;

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("tm-"))
        .map((key) => caches.delete(key)),
    );
  }

  if (!isServiceWorkerSupported()) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map((registration) =>
      registration.active?.postMessage({ type: "CLEAR_CACHES" }),
    ),
  );
}
