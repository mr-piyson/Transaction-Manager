import { defineAppHotkeys } from "@tanstack/react-hotkeys";

/**
 * Every keyboard shortcut the dashboard shell understands.
 *
 * Defaults are deliberately conflict-free: `Mod+K` opens the command palette
 * and `Mod+Shift+K` focuses sidebar search. Users can rebind either action in
 * Settings → Keyboard Shortcuts.
 */
export const appHotkeys = defineAppHotkeys({
  "commandPalette.toggle": {
    hotkey: "Mod+K",
    meta: {
      name: "Command palette",
      description: "Open or close the global command palette",
      group: "General",
    },
  },
  "sidebar.search.focus": {
    hotkey: "Mod+Shift+K",
    meta: {
      name: "Focus sidebar search",
      description: "Expand the sidebar and focus its navigation search",
      group: "Navigation",
    },
  },
  "sidebar.toggle": {
    hotkey: "Mod+B",
    meta: {
      name: "Toggle sidebar",
      description: "Expand or collapse the navigation sidebar",
      group: "Navigation",
    },
  },
});

declare module "@tanstack/react-hotkeys" {
  interface Register {
    appHotkeys: typeof appHotkeys;
  }
}
