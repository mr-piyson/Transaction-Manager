"use client";

import { formatForDisplay, type Hotkey } from "@tanstack/react-hotkeys";
import { useEffect, useState } from "react";

/**
 * Formats a hotkey for display only after mount.
 *
 * `formatForDisplay` auto-detects the platform, which differs between the
 * server (defaults to Linux) and the browser. Rendering only after mount keeps
 * the server and first client render identical and avoids hydration warnings.
 */
export function useHotkeyLabel(
  hotkey: Hotkey | null | undefined,
): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(hotkey ? formatForDisplay(hotkey) : null);
  }, [hotkey]);

  return label;
}
