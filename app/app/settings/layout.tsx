'use client';

import { useTranslations } from 'next-intl';
import { Menu, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Header } from '@/app/app/App-Header';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './_shared';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const activeSection = pathname.split('/').pop() ?? 'general';
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <SidebarGroup>
      <SidebarGroupLabel className="px-3 text-xs uppercase tracking-wider">
        {t('settings.title')}
      </SidebarGroupLabel>
      <SidebarMenu>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeSection;
          return (
            <SidebarMenuItem key={item.id}>
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{t(item.labelKey)}</span>
              </Link>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );

  return (
    <div className="flex flex-col h-screen">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <Header
          title={t('settings.title')}
          icon={<Settings className="size-5" />}
        >
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="md:hidden gap-2"
            >
              <Menu className="size-4" />
              {t(
                NAV_ITEMS.find((i) => i.id === activeSection)?.labelKey ?? 'settings.title',
              )}
            </Button>
          </SheetTrigger>
        </Header>
        <SheetContent side="left" className="w-64 p-4">
          <SheetHeader>
            <SheetTitle className="text-lg">{t('settings.title')}</SheetTitle>
          </SheetHeader>
          <nav className="mt-4">{nav}</nav>
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="w-56 shrink-0 border-r border-sidebar-border bg-sidebar hidden md:flex flex-col py-4">
          {nav}
        </aside>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
