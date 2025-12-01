"use client";

import * as React from "react";

// 1. Define the available theme variables based on your CSS
export type ThemeColorKey =
  | "background"
  | "foreground"
  | "card"
  | "card-foreground"
  | "popover"
  | "popover-foreground"
  | "primary"
  | "primary-foreground"
  | "secondary"
  | "secondary-foreground"
  | "muted"
  | "muted-foreground"
  | "accent"
  | "accent-foreground"
  | "default"
  | "default-foreground"
  | "destructive"
  | "destructive-foreground"
  | "warning"
  | "warning-foreground"
  | "success"
  | "success-foreground"
  | "border"
  | "input"
  | "ring"
  | "chart-1"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-5"
  | "sidebar"
  | "sidebar-foreground"
  | "sidebar-primary"
  | "sidebar-primary-foreground"
  | "sidebar-accent"
  | "sidebar-accent-foreground"
  | "sidebar-border"
  | "sidebar-ring";

// Helper to get CSS variable name
const getVariableName = (key: ThemeColorKey) => `--${key}`;

type ThemeColorsState = Partial<Record<ThemeColorKey, string>>;

interface ThemeColorContextType {
  colors: ThemeColorsState;
  setColor: (key: ThemeColorKey, value: string) => void;
  removeColor: (key: ThemeColorKey) => void;
  resetColors: () => void;
}

const ThemeColorContext = React.createContext<ThemeColorContextType | undefined>(undefined);

const STORAGE_KEY = "user-theme-colors";

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColors] = React.useState<ThemeColorsState>({});
  const [mounted, setMounted] = React.useState(false);

  // Load from local storage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setColors(parsed);
        // Apply loaded colors immediately
        Object.entries(parsed).forEach(([key, value]) => {
          document.documentElement.style.setProperty(getVariableName(key as ThemeColorKey), value as string);
        });
      } catch (e) {
        console.error("Failed to parse theme colors", e);
      }
    }
    setMounted(true);
  }, []);

  const setColor = React.useCallback((key: ThemeColorKey, value: string) => {
    setColors(prev => {
      const newColors = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newColors));
      return newColors;
    });
    document.documentElement.style.setProperty(getVariableName(key), value);
  }, []);

  const removeColor = React.useCallback((key: ThemeColorKey) => {
    setColors(prev => {
      const newColors = { ...prev };
      delete newColors[key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newColors));
      return newColors;
    });
    document.documentElement.style.removeProperty(getVariableName(key));
  }, []);

  const resetColors = React.useCallback(() => {
    setColors({});
    localStorage.removeItem(STORAGE_KEY);
    // Remove all inline styles for our keys
    // Note: This relies on the list of keys defined in the type
    // In a dynamic scenario, you might track which keys were set.
    const allKeys: ThemeColorKey[] = [
      "background",
      "foreground",
      "card",
      "card-foreground",
      "popover",
      "popover-foreground",
      "primary",
      "primary-foreground",
      "secondary",
      "secondary-foreground",
      "muted",
      "muted-foreground",
      "accent",
      "accent-foreground",
      "default",
      "default-foreground",
      "destructive",
      "destructive-foreground",
      "warning",
      "warning-foreground",
      "success",
      "success-foreground",
      "border",
      "input",
      "ring",
      "chart-1",
      "chart-2",
      "chart-3",
      "chart-4",
      "chart-5",
      "sidebar",
      "sidebar-foreground",
      "sidebar-primary",
      "sidebar-primary-foreground",
      "sidebar-accent",
      "sidebar-accent-foreground",
      "sidebar-border",
      "sidebar-ring",
    ];

    allKeys.forEach(key => {
      document.documentElement.style.removeProperty(getVariableName(key));
    });
  }, []);

  // Prevent flash by blocking render until mounted (optional, depending on preference)
  // For theme colors, it's usually okay to render and then snap colors in,
  // but returning children immediately allows the app to load faster.

  return <ThemeColorContext.Provider value={{ colors, setColor, removeColor, resetColors }}>{children}</ThemeColorContext.Provider>;
}

export function useThemeColor() {
  const context = React.useContext(ThemeColorContext);
  if (context === undefined) {
    throw new Error("useThemeColor must be used within a ThemeColorProvider");
  }
  return context;
}
