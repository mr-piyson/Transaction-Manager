"use client";

import { ThemeSwitcher } from "@/components/Theme-Provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommandShortcut } from "@/components/ui/command";
import { SidebarProvider, useSidebar } from "@/components/sidebar";
import { useRouter } from "next/navigation";
import { useMemo, useCallback, memo } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, LogOut, Moon } from "lucide-react";
import { Toolbar } from "./Toolbar";
import { AppSidebar } from "./Sidebar";
import { useTheme } from "next-themes";
import { signOut } from "@/lib/auth/auth-server";
import { useI18n } from "@/hooks/use-i18n";
import { LANGUAGE_CONFIG, Locale } from "@/lib/i18n/i18n-core";

// Create QueryClient instance outside component to prevent recreation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

interface AppProps {
  children: React.ReactNode;
}

export default function App({ children }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider className="flex h-screen overflow-hidden">
        <AppSidebar />
        <div className="relative flex flex-col flex-1 min-h-full">
          {/* Toolbar fixed at top */}
          <Toolbar className="sticky top-0 z-10" />

          {/* Scrollable main area */}
          <div className="flex-1 overflow-auto relative">{children}</div>
        </div>
      </SidebarProvider>
    </QueryClientProvider>
  );
}

// Memoized UserMenu component to prevent unnecessary re-renders
export const UserMenu = memo(function UserMenu() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { locale, setLocale, availableLocales, isPending } = useI18n();

  // Memoize account data - in production, this would come from a hook/context
  const account = useMemo(
    () => ({
      name: "John Doe",
      email: "q3m9t@example.com",
      image: "",
      role: "admin",
    }),
    []
  );

  // Memoize avatar fallback
  const avatarFallback = useMemo(() => account.name.charAt(0).toUpperCase(), [account.name]);

  // Memoize theme toggle handler
  const handleThemeToggle = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  // Memoize sign out handler
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  }, []);

  // Memoize locale change handler
  const handleLocaleChange = useCallback(
    (newLocale: Locale) => {
      setLocale(newLocale);
    },
    [setLocale]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="data-[state=open]:border-border border-2 border-transparent">
          <Avatar className="h-8 w-8">
            <AvatarImage src={account.image || undefined} alt={account.name} />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <div className="max-sm:hidden grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{account.name}</span>
            <span className="truncate text-xs">{account.email}</span>
          </div>
          <ChevronsUpDown className="max-sm:hidden ml-auto size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="bg-popover/95 backdrop-blur supports-[backdrop-filter]:bg-popover/85 w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8">
              <AvatarImage src={account.image || undefined} alt={account.name} />
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{account.name}</span>
              <span className="truncate text-xs">{account.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Languages</DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {availableLocales.map(loc => (
                <DropdownMenuItem key={loc} onClick={() => handleLocaleChange(loc as Locale)} disabled={isPending}>
                  {LANGUAGE_CONFIG[loc]?.nativeName || loc}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleThemeToggle}>
            <Moon className="mr-2 h-4 w-4" />
            Dark Mode
            <CommandShortcut>
              <ThemeSwitcher />
            </CommandShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

// Removed LanguageSwitcher as it's unused and redundant with the dropdown menu
