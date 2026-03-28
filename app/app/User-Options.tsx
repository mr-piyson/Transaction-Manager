'use client';

import {
  BadgeCheck,
  Bell,
  Check,
  ChevronsUpDown,
  CreditCard,
  Globe,
  Languages,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sparkles,
  Sun,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import { useSession } from '@/lib/auth-client';
import { useI18n } from '@/i18n/use-i18n';
import { LANGUAGE_CONFIG } from '@/i18n/config';

export function NavUser() {
  const { data } = useSession();
  const { isMobile } = useSidebar();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { availableLocales, setLocale, locale } = useI18n();
  const user = data?.user;

  const toggleTheme = (e: React.MouseEvent | React.BaseSyntheticEvent) => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user?.image || ''} alt={user?.name || ''} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user?.name}</span>
                  <span className="truncate text-xs">{user?.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            }
          ></DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-background/90 backdrop-blur-md supports-backdrop-filter:bg-background/60 border-border">
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="after:border-none rounded-lg h-8 w-8">
                  <AvatarImage src={user?.image || ''} alt={user?.name || ''} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user?.name}</span>
                  <span className="truncate text-xs">{user?.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* Appearance Item with toggle */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-1.5 text-sm">Appearance</DropdownMenuLabel>

              <DropdownMenuItem
                onClick={toggleTheme} // Base UI sometimes uses onSelect
                className={'bg-transparent!'}
              >
                {theme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
                <span>Dark Mode</span>
                <DropdownMenuShortcut>
                  <Switch checked={theme === 'dark'} />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {/* internlization */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-1.5 text-sm">Internlization</DropdownMenuLabel>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Languages className="mr-2 h-4 w-4" />
                  <span>Language</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {availableLocales.map((lang) => (
                      <DropdownMenuItem key={lang} onClick={() => setLocale(lang)}>
                        <span>{LANGUAGE_CONFIG[lang].nativeName}</span>
                        {locale === lang && (
                          <Check className="ml-auto h-4 w-4 text-muted-foreground" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="size-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
