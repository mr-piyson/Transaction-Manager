"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { SERVICE_WORKER_URL } from "@/lib/pwa";

/**
 * Registers the service worker and keeps it up to date.
 *
 * Disabled during `next dev` because a caching service worker fights with
 * hot module replacement. Set NEXT_PUBLIC_PWA_DEV=true to test the install
 * flow locally.
 */
export function ServiceWorkerRegistration() {
  const reloading = useRef(false);
  // Only reload when *we* asked the waiting worker to take over. The first
  // install also fires controllerchange (via clients.claim) and must not
  // interrupt the page the user is looking at.
  const updateAccepted = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isDev = process.env.NODE_ENV === "development";
    if (isDev && process.env.NEXT_PUBLIC_PWA_DEV !== "true") return;

    let cancelled = false;

    async function register() {
      try {
        const registration = await navigator.serviceWorker.register(
          SERVICE_WORKER_URL,
          { scope: "/" },
        );

        if (cancelled) return;

        // A new worker finished installing while an older one still controls
        // the page — offer to swap it in.
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              toast("A new version is available", {
                description: "Reload to apply the latest updates.",
                duration: Infinity,
                action: {
                  label: "Reload",
                  onClick: () => {
                    updateAccepted.current = true;
                    installing.postMessage({ type: "SKIP_WAITING" });
                  },
                },
              });
            }
          });
        });

        // Check for a new build when the tab comes back to the foreground.
        const onVisibilityChange = () => {
          if (document.visibilityState === "visible") registration.update();
        };
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () =>
          document.removeEventListener("visibilitychange", onVisibilityChange);
      } catch (error) {
        console.error("[pwa] service worker registration failed", error);
      }
    }

    let cleanup: (() => void) | undefined;
    register().then((fn) => {
      cleanup = fn;
    });

    // Reload once the new worker takes over so the page picks up fresh assets.
    const onControllerChange = () => {
      if (!updateAccepted.current) return;
      if (reloading.current) return;
      reloading.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    // Let the user know when the connection drops — the ERP cannot save
    // anything while offline.
    const onOffline = () =>
      toast.error("You are offline", {
        description: "Changes cannot be saved until the connection returns.",
        duration: Infinity,
      });

    const onOnline = () => toast.success("Back online");

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      cleanup?.();
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
