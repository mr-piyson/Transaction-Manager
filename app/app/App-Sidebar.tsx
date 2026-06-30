'use client';

import { ChevronDown, SidebarIcon, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { AppActions, AppSubjects } from '@/lib/permissions';
import { apps, getAppFromPath } from '@/lib/apps';
import { cn } from '@/lib/utils';
import { NavUser } from './User-Options';

// 1. Define what a single route looks like
export type RouteConfig = {
  type: 'item' | 'group';
  label: string; // optional fallback
  href?: string;
  icon?: LucideIcon;
  children?: RouteConfig[];
  auth?: { action: AppActions; subject: AppSubjects };
  // 🔍 search metadata
  search?: {
    keywords?: string[]; // additional keywords for search
    hidden?: boolean; // exclude from search
  };
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {}

export function AppSidebar({ ...props }: AppSidebarProps) {
  const currentPath = usePathname();
  const { isMobile, open, setOpenMobile } = useSidebar();
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const locale = useLocale();
  const t = useTranslations();
  const isRtl = locale === 'ar';

  const currentApp = getAppFromPath(currentPath);
  const ROUTES = currentApp.getRoutes(t as (key: string) => string);

  useEffect(() => {
    if (loading === currentPath) {
      if (loading !== '') setLoading('');
      setOpenMobile(false);
    }
  }, [currentPath, setOpenMobile, loading]);

  /** Match /app/customers regardless of sub-paths */
  const isActive = (href?: string) => {
    if (!href) return false;
    const prefix = currentPath.split('/').slice(0, 3).join('/');
    return prefix === href || currentPath === href;
  };

  const handleNavigate = (href: string) => {
    if (currentPath === href) return;
    setLoading(href);
    router.push(href);
  };

  const showSpinnerFor = (href: string) => loading === href && (!open || isMobile);

  return (
    <Sidebar side={isRtl ? 'right' : 'left'} collapsible="icon" type="Drawer" {...props}>
      <SidebarHeader>
        <AppSidebarHeader currentApp={currentApp} t={t as (key: string) => string} isRtl={isRtl} />
      </SidebarHeader>

      <SidebarContent>
        {ROUTES.map((route) =>
          route.type === 'group' ? (
            <RouteGroup
              key={route.label}
              route={route as RouteConfig & { type: 'group' }}
              isActive={isActive}
              loading={loading}
              open={open}
              isMobile={isMobile}
              showSpinnerFor={showSpinnerFor}
              onNavigate={handleNavigate}
            />
          ) : (
            // Top-level items without a group wrapper
            <SidebarGroup key={route.label}>
              <SidebarMenu>
                <RouteItem
                  route={route}
                  isActive={isActive}
                  loading={loading}
                  open={open}
                  isMobile={isMobile}
                  showSpinnerFor={showSpinnerFor}
                  onNavigate={handleNavigate}
                />
              </SidebarMenu>
            </SidebarGroup>
          ),
        )}
      </SidebarContent>

      <SidebarFooter>{!isMobile && <NavUser />}</SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

// ─── Route Group ─────────────────────────────────────────────────────────────

interface SharedProps {
  isActive: (href?: string) => boolean;
  loading: string;
  open: boolean;
  isMobile: boolean;
  showSpinnerFor: (href: string) => boolean;
  onNavigate: (href: string) => void;
}

function RouteGroup({
  route,
  ...shared
}: SharedProps & { route: RouteConfig & { type: 'group' } }) {
  const [open, setOpen] = useState(true);

  return (
    <SidebarGroup>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* LABEL = navigation */}
        <SidebarGroupLabel style={{ flex: 1 }}>{route.label}</SidebarGroupLabel>

        {/* ARROW = toggle */}
        <ChevronDown
          size={16}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
          style={{
            transition: 'transform 0.2s',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
      </div>

      {/* COLLAPSIBLE CONTENT */}
      {open && (
        <SidebarMenu>
          {route.children?.map((child) => (
            <RouteItem key={child.label} route={child} {...shared} />
          ))}
        </SidebarMenu>
      )}
    </SidebarGroup>
  );
}

// ─── Route Item (leaf or nested) ─────────────────────────────────────────────

function RouteItem({ route, ...shared }: SharedProps & { route: RouteConfig }) {
  const { isActive, loading, showSpinnerFor, onNavigate } = shared;

  const active = isActive(route.href);
  const href = route.href as string | undefined;
  const Icon = route.icon;

  const hasChildren = route.children && route.children.length > 0;

  if (hasChildren) {
    return (
      <SidebarMenuItem>
        {/* Parent button – navigates if it has an href, otherwise just a label */}
        <SidebarMenuButton
          isActive={active}
          tooltip={route.label}
          className={cn('flex', active && 'bg-primary!')}
          onClick={() => href && onNavigate(href)}
        >
          {Icon && (
            <Icon
              className={cn(
                'ms-1 size-5 shrink-0',
                active ? 'text-white' : 'text-foreground/92',
                href && showSpinnerFor(href) ? 'hidden' : '',
              )}
            />
          )}
          <div className="flex items-center justify-between w-full">
            <span
              className={cn(
                'text-base',
                active ? 'text-white' : 'text-foreground/92',
                href && showSpinnerFor(href) ? 'hidden' : '',
              )}
            >
              {route.label}
            </span>
            {href && loading === href && <Spinner />}
          </div>
        </SidebarMenuButton>

        {/* Sub-items */}
        <SidebarMenuSub>
          {route.children?.map((child) => {
            const childHref = child.href as string | undefined;
            const childActive = isActive(childHref);
            const childLabel = child.label;
            const ChildIcon = child.icon;

            return (
              <SidebarMenuSubItem key={child.label}>
                <SidebarMenuSubButton
                  isActive={childActive}
                  className={cn(childActive && 'bg-primary! text-white')}
                  onClick={() => childHref && onNavigate(childHref)}
                >
                  {ChildIcon && (
                    <ChildIcon
                      className={cn(
                        'size-4 shrink-0',
                        childActive ? 'text-white' : 'text-foreground/80',
                      )}
                    />
                  )}
                  <span>{childLabel}</span>
                  {childHref && loading === childHref && <Spinner />}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      </SidebarMenuItem>
    );
  }

  // Leaf item
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        className={cn('flex', active && 'bg-primary!')}
        tooltip={route.label}
        onClick={() => href && onNavigate(href)}
      >
        {Icon && (
          <Icon
            className={cn(
              'size-5 shrink-0',
              active ? 'text-white' : 'text-foreground/92',
              href && showSpinnerFor(href) ? 'hidden' : '',
            )}
          />
        )}
        <div className="flex items-center justify-between w-full">
          <span
            className={cn(
              'text-base',
              active ? 'text-white' : 'text-foreground/92',
              href && showSpinnerFor(href) ? 'hidden' : '',
            )}
          >
            {route.label}
          </span>
          {href && loading === href && <Spinner />}
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// ─── App Switcher ────────────────────────────────────────────────────────────

function AppSwitcher({
  currentApp,
  t,
}: {
  currentApp: { slug: string; nameKey: string; icon: LucideIcon };
  t: (key: string) => string;
}) {
  const router = useRouter();
  const Icon = currentApp.icon;

  const handleSwitch = (slug: string) => {
    if (slug === currentApp.slug) return;
    if (slug === 'hr') router.push('/app/hr');
    else router.push('/app');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full flex items-center gap-2 px-2 justify-start h-9 data-[state=open]:bg-accent"
        >
          <Icon className="size-4 shrink-0" />
          <span className="text-sm font-medium truncate flex-1 text-left">
            {t(currentApp.nameKey)}
          </span>
          <ChevronDown className="size-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-48">
        {apps
          .filter((a) => a.isActive)
          .map((app) => {
            const AppIcon = app.icon;
            return (
              <DropdownMenuItem
                key={app.slug}
                onClick={() => handleSwitch(app.slug)}
                className={app.slug === currentApp.slug ? 'bg-accent font-medium' : ''}
              >
                <AppIcon className="size-4 mr-2" />
                <span>{t(app.nameKey)}</span>
              </DropdownMenuItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Sidebar Header ─────────────────────────────────────────────────────────

function AppSidebarHeader({
  currentApp,
  t,
  isRtl,
}: {
  currentApp: { slug: string; nameKey: string; icon: LucideIcon };
  t: (key: string) => string;
  isRtl: boolean;
}) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Link href={currentApp.slug === 'hr' ? '/app/hr' : '/app'}>
          <SidebarMenuButton
            size="lg"
            dir={isRtl ? 'rtl' : 'ltr'}
            className="flex flex-row opacity-100! data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
              <Logo className="size-7!" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-lg">{t('layout.appTitle')}</span>
            </div>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <AppSwitcher currentApp={currentApp} t={t} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function SidebarToggleButton(props: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();
  const t = useTranslations();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      aria-label={t('layout.toggleSidebar')}
      {...props}
    >
      <SidebarIcon className="size-5" />
    </Button>
  );
}
