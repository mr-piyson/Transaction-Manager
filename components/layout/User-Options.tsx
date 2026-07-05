'use client';

import { ChevronsUpDown, LogOut, Moon, Settings, Sun, User2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSession } from '@/auth/auth-client';
import { useActionHandlers } from '@/lib/actions';
import { LocaleSwitcherMenu } from '@/components/locale-switcher';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { Button } from '../ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

export function NavUser() {
  const t = useTranslations();
  const { handleSignOut, handleToggleTheme, theme } = useActionHandlers();
  const user = useSession().data?.user;
  const isMobile = useIsMobile();

  /**
   * Generates a deterministic HSL color based on a string (e.g., a user's name).
   * This ensures the same name always gets the same background color.
   */
  function getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate hue between 0 and 360
    const hue = Math.abs(hash % 360);

    // Keep saturation and lightness in a pleasant pastel/vibrant range
    // suitable for avatar backgrounds (e.g., 65% saturation, 55% lightness)
    const saturation = 65;
    const lightness = 55;

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Converts an HSL string to RGB to calculate relative luminance,
   * then returns 'black' or 'white' depending on what provides better contrast.
   */
  function getContrastColor(hslString: string): 'black' | 'white' {
    // Extract numbers from the hsl(h, s%, l%) string
    const matches = hslString.match(/\d+/g);
    if (!matches || matches.length < 3) return 'white';

    const h = parseInt(matches[0], 10);
    const s = parseInt(matches[1], 10) / 100;
    const l = parseInt(matches[2], 10) / 100;

    // Convert HSL to RGB helper
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));

    const r = f(0);
    const g = f(8);
    const b = f(4);

    // Calculate relative luminance using the W3C formula
    // Formula: 0.2126 * R + 0.7152 * G + 0.0722 * B
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // If luminance is bright (> 0.5), use black text/icon for contrast. Otherwise, use white.
    return luminance > 0.5 ? 'black' : 'white';
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={user?.image || ''} alt={user?.name || ''} />
            <AvatarFallback
              className="rounded-lg"
              style={{
                backgroundColor: getAvatarColor(user?.name || ''),
                color: getContrastColor(getAvatarColor(user?.name || '')),
              }}
            >
              <User2 size={16} />
            </AvatarFallback>
          </Avatar>
          {!isMobile && (
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user?.name}</span>
              <span className="truncate text-xs">{user?.email}</span>
            </div>
          )}
          <ChevronsUpDown className="ml-auto size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-popover border-border">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="after:border-none rounded-lg h-8 w-8">
              <AvatarImage src={user?.image || ''} alt={user?.name || ''} />
              <AvatarFallback
                className="rounded-lg"
                style={{
                  backgroundColor: getAvatarColor(user?.name || ''),
                  color: getContrastColor(getAvatarColor(user?.name || '')),
                }}
              >
                <User2 size={16} />
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user?.name}</span>
              <span className="truncate text-xs">{user?.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5 text-sm">
            {t('layout.appearance')}
          </DropdownMenuLabel>

          <DropdownMenuItem onClick={handleToggleTheme} className={'bg-transparent!'}>
            {theme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
            <span>{t('layout.darkMode')}</span>
            <DropdownMenuShortcut>
              <Switch checked={theme === 'dark'} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <LocaleSwitcherMenu />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2">
            <Settings className="size-4" />
            <span>{t('layout.settings')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut />
          {t('layout.logOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
