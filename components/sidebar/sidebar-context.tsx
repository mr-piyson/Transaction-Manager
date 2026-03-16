'use client';

import { useIsMobile } from '@/hooks/use-mobile';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export interface BadgeConfig {
  content: string | (() => string | null);
  variant?: BadgeVariant;
}

export type NodeAction = { type: 'link'; href: string; exact?: boolean } | { type: 'button'; onClick: () => void } | { type: 'custom'; render: () => React.ReactNode };

export interface BaseNode {
  id: string;
  order?: number;
  visible?: boolean | (() => boolean);
  featureFlag?: string;
  className?: string;
  testId?: string;
}

export interface SeparatorNode extends BaseNode {
  kind: 'separator';
}

export interface ItemNode extends BaseNode {
  kind: 'item';
  label: string | (() => string);
  icon?: React.ReactNode | (() => React.ReactNode);
  tooltip?: string | (() => string);
  badge?: BadgeConfig;
  disabled?: boolean | (() => boolean);
  action?: NodeAction;
}

export interface GroupNode extends BaseNode {
  kind: 'group';
  label: string | (() => string);
  icon?: React.ReactNode | (() => React.ReactNode);
  tooltip?: string | (() => string);
  badge?: BadgeConfig;
  disabled?: boolean | (() => boolean);
  collapsible?: boolean;
  defaultOpen?: boolean;
  children?: SidebarNode[];
}

export type SidebarNode = SeparatorNode | ItemNode | GroupNode;

/* ── Sidebar state context ── */
interface SidebarStateCtx {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (v: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (v: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

export const SidebarStateContext = createContext<SidebarStateCtx | null>(null);
export const NavContext = createContext<((href: string) => void) | null>(null);

export function useSidebar() {
  const ctx = useContext(SidebarStateContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  onNavigate?: (href: string) => void;
}

export function SidebarProvider({ children, defaultOpen = true, onNavigate }: SidebarProviderProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(defaultOpen);
  const [openMobile, setOpenMobile] = useState(false);

  const toggleSidebar = useCallback(() => (isMobile ? setOpenMobile((o) => !o) : setOpen((o) => !o)), [isMobile]);

  const value = useMemo(
    () => ({
      state: (open ? 'expanded' : 'collapsed') as 'expanded' | 'collapsed',
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [open, openMobile, isMobile, toggleSidebar],
  );

  return (
    <NavContext.Provider value={onNavigate ?? null}>
      <SidebarStateContext.Provider value={value}>{children}</SidebarStateContext.Provider>
    </NavContext.Provider>
  );
}
