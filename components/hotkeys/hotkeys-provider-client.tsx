"use client";

import { type CustomHotkeys, HotkeysProvider } from "@tanstack/react-hotkeys";
import { toast } from "sonner";
import { appHotkeys } from "@/lib/hotkeys/app-hotkeys";
import { trpc } from "@/lib/trpc/client";

interface HotkeysProviderClientProps {
  children: React.ReactNode;
  /** Sparse map of the user's overrides: action id → hotkey (null = unbound). */
  customHotkeys?: CustomHotkeys;
}

export function HotkeysProviderClient({
  children,
  customHotkeys,
}: HotkeysProviderClientProps) {
  const saveCustom = trpc.shortcuts.saveCustom.useMutation({
    onError: (error) => toast.error(error.message),
  });

  return (
    <HotkeysProvider
      appHotkeys={appHotkeys}
      customHotkeys={customHotkeys ?? {}}
      onCustomHotkeysChange={(next) => {
        // Every dashboard hotkey is a chord, but the library's type also allows
        // sequences. Store only string chords; map anything else to unbound.
        const serialized: Record<string, string | null> = {};
        for (const [id, hotkey] of Object.entries(next)) {
          serialized[id] = typeof hotkey === "string" ? hotkey : null;
        }
        saveCustom.mutate(serialized);
      }}
    >
      {children}
    </HotkeysProvider>
  );
}
