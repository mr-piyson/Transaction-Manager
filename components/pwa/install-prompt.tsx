"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, X } from "lucide-react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

/**
 * "Add to home screen" banner.
 *
 * Chromium gets a real install button (the browser defers the actual prompt
 * until the user clicks). iOS Safari has no install API, so we explain the
 * Share → "Add to Home Screen" flow instead.
 */
export function InstallPrompt() {
  const { showBanner, install, dismiss, platform } = useInstallPrompt();

  return (
    <AnimatePresence>
      {showBanner ? (
        <motion.div
          key="install-prompt"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-w-sm"
        >
          <div className="flex items-start gap-3 rounded-xl border border-border bg-popover p-4 shadow-lg">
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary">
              <Logo className="size-7" primaryColor="#4A7BF5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                Install Transaction Manager
              </p>

              {platform === "ios" ? (
                <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Share className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Tap the Share button, then choose{" "}
                    <span className="font-medium text-foreground">
                      Add to Home Screen
                    </span>
                    .
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Run it like a native app — faster access and an offline
                  fallback.
                </p>
              )}

              <div className="mt-3 flex items-center gap-2">
                {platform === "chromium" ? (
                  <Button size="sm" onClick={() => void install()}>
                    <Download className="size-3.5" />
                    Install
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={dismiss}>
                  Not now
                </Button>
              </div>
            </div>

            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss install prompt"
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
