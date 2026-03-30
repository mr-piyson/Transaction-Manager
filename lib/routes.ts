import { TranslationKeys } from '@/i18n/config';
import {
  FilePenLine,
  FileText,
  LayoutDashboard,
  LucideIcon,
  Package,
  Settings,
  User,
  UserCircle,
} from 'lucide-react';
import { Route } from 'next';
import { AppActions, AppSubjects } from './permissions';

// 1. Define what a single route looks like
export type RouteConfig = {
  type: 'item' | 'group';
  key: TranslationKeys; // for i18n lookup
  label: string; // optional fallback
  href?: Route;
  icon?: LucideIcon;
  children?: RouteConfig[];
  auth?: { action: AppActions; subject: AppSubjects };
  // 🔍 search metadata
  search?: {
    keywords?: string[]; // additional keywords for search
    hidden?: boolean; // exclude from search
  };
};

// Derive a type from the const
export type Routes = typeof ROUTES;

// Define the routes as a const to get literal types
export const ROUTES = [
  {
    type: 'group',
    label: 'Navigation',
    key: 'common.navigation',
    children: [
      {
        type: 'item',
        label: 'Customers',
        key: 'common.customers',
        href: '/app/customers',
        icon: User,
      },
      {
        type: 'item',
        label: 'Inventory Items',
        key: 'common.inventoryItems',
        href: '/app/inventory',
        icon: Package,
      },
      {
        type: 'item',
        label: 'Invoices',
        key: 'common.invoices',
        href: '/app/invoices',
        icon: FileText,
      },

      {
        type: 'item',
        label: 'Contracts',
        key: 'common.contracts',
        href: '/app/contracts',
        icon: FilePenLine,
      },
      {
        type: 'item',
        label: 'Dashboard',
        key: 'common.dashboard',
        href: '/app/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
] as const satisfies RouteConfig[];
