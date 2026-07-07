'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookType,
  Briefcase,
  Building2,
  Coins,
  Languages,
  Layers,
  LogOut,
  Moon,
  Package,
  Palette,
  Percent,
  Shield,
  Sun,
  User,
  Users,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { signOut } from '@/auth/auth-client';
import { useLocaleSwitcher } from '@/hooks/use-locale';

// --- Types ---

export interface NavItem {
  id: string;
  labelKey: string;
  href: string;
  icon: LucideIcon;
}

export interface PaletteAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  keywords?: string[];
  href?: string;
  onSelect?: () => void | Promise<void>;
}

export interface PaletteGroup {
  id: string;
  label: string;
  items: PaletteAction[];
}

// --- Settings Navigation ---

export const NAV_ITEMS = [
  { id: 'general', labelKey: 'settings.general', href: '/settings/general', icon: Building2 },
  { id: 'financial', labelKey: 'settings.financial', href: '/settings/financial', icon: Coins },
  {
    id: 'tax-rates',
    labelKey: 'settings.defaultTaxRate',
    href: '/settings/tax-rates',
    icon: Percent,
  },
  { id: 'categories', labelKey: 'items.category', href: '/settings/categories', icon: Layers },
  {
    id: 'item-master',
    labelKey: 'settings.itemMaster.title',
    href: '/settings/item-master',
    icon: Package,
  },
  {
    id: 'chart-of-accounts',
    labelKey: 'settings.chartOfAccounts',
    href: '/settings/chart-of-accounts',
    icon: BookType,
  },
  { id: 'sessions', labelKey: 'settings.sessions', href: '/settings/sessions', icon: LogOut },
  { id: 'hrms', labelKey: 'settings.hrms.title', href: '/settings/hrms', icon: Briefcase },
  {
    id: 'appearance',
    labelKey: 'settings.appearance',
    href: '/settings/appearance',
    icon: Palette,
  },
  {
    id: 'notifications',
    labelKey: 'settings.notifications',
    href: '/settings/notifications',
    icon: Bell,
  },
  { id: 'user', labelKey: 'auth.name', href: '/settings/user', icon: User },
  { id: 'users', labelKey: 'users.title', href: '/settings/users', icon: Users },
  {
    id: 'permissions',
    labelKey: 'users.permissionsPageTitle',
    href: '/settings/permissions',
    icon: Shield,
  },
] as const satisfies NavItem[];

// --- Shared Action Handlers ---

export function useActionHandlers() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { switchLocale } = useLocaleSwitcher();

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push('/auth');
  }, [router]);

  const handleToggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { handleSignOut, handleToggleTheme, handleSwitchLocale: switchLocale, theme, setTheme };
}

// --- Actions / Command Palette ---

export function usePaletteActions(t: (key: string) => string): PaletteGroup[] {
  const { handleSignOut, handleToggleTheme, handleSwitchLocale, theme } = useActionHandlers();

  return [
    {
      id: 'settings',
      label: t('settings.title'),
      items: NAV_ITEMS.map((item) => ({
        id: `settings:${item.href}`,
        label: t(item.labelKey),
        icon: item.icon,
        href: item.href,
        keywords: [],
      })),
    },
    {
      id: 'actions',
      label: t('layout.actions') || 'Actions',
      items: [
        {
          id: 'theme-toggle',
          label:
            theme === 'dark'
              ? t('layout.lightMode') || 'Light Mode'
              : t('layout.darkMode') || 'Dark Mode',
          icon: theme === 'dark' ? Sun : Moon,
          keywords: ['theme', 'dark', 'light', 'mode', 'appearance'],
          onSelect: handleToggleTheme,
        },
        {
          id: 'locale-en',
          label: 'English',
          icon: Languages,
          keywords: ['language', 'english', 'lang', 'en'],
          onSelect: () => handleSwitchLocale('en'),
        },
        {
          id: 'locale-ar',
          label: 'العربية',
          icon: Languages,
          keywords: ['language', 'arabic', 'lang', 'ar', 'عربي'],
          onSelect: () => handleSwitchLocale('ar'),
        },
        {
          id: 'logout',
          label: t('layout.logOut') || 'Log out',
          icon: LogOut,
          keywords: ['logout', 'signout', 'sign out', 'exit'],
          onSelect: handleSignOut,
        },
      ],
    },
  ];
}
