"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { Switch } from "./ui/switch";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export const ThemeSwitcher = (props: any) => {
  const theme = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Switch
      checked={theme.resolvedTheme === "dark"}
      onCheckedChange={() => {
        theme.setTheme(theme.resolvedTheme === "dark" ? "light" : "dark");
      }}
    />
  );
};
