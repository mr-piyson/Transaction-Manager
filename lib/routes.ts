import { TranslationKeys } from '@/i18n/config';
import {
  Box,
  Boxes,
  FilePenLine,
  FileText,
  HandCoinsIcon,
  LayoutDashboard,
  LucideIcon,
  Package,
  Settings,
  ShoppingCart,
  Store,
  User,
  UserCircle,
  Warehouse,
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
    label: 'Actions',
    key: 'common.actions',
    children: [
      {
        type: 'item',
        label: 'Purchase',
        key: 'common.purchase',
        href: '/app/purchases',
        icon: ShoppingCart,
      },
      {
        type: 'item',
        label: 'New Item',
        key: 'common.items',
        href: '/app/items',
        icon: UserCircle,
      },
    ],
  },
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
        label: 'Suppliers',
        key: 'common.suppliers',
        href: '/app/suppliers',
        icon: Store,
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
  {
    type: 'group',
    label: 'Inventory',
    key: 'common.inventory',
    icon: Package,
    children: [
      {
        type: 'item',
        label: 'Warehouses',
        key: 'common.warehouses',
        href: '/app/warehouses',
        icon: Warehouse,
      },
      {
        type: 'item',
        label: 'Items Master',
        key: 'common.items',
        href: '/app/stock-items',
        icon: Boxes,
      },
      {
        type: 'item',
        label: 'Stock',
        key: 'common.stock',
        href: '/app/stock',
        icon: Box,
      },
    ],
  },
] as const satisfies RouteConfig[];
