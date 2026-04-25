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
  PackageSearch,
  Settings,
  ShoppingCart,
  ShoppingCartIcon,
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
    label: 'Navigation',
    key: 'common.navigation',
    children: [
      {
        type: 'item',
        label: 'Dashboard',
        key: 'common.dashboard',
        href: '/app',
        icon: LayoutDashboard,
      },
      {
        type: 'item',
        label: 'Customers',
        key: 'common.customers',
        href: '/app/customers',
        icon: User,
        auth: { action: 'read', subject: 'Customer' },
      },
      {
        type: 'item',
        label: 'Purchase Order',
        key: 'common.purchaseOrders',
        href: '/app/purchase-order',
        icon: ShoppingCartIcon,
      },
      {
        type: 'item',
        label: 'Products & Services',
        key: 'common.productsAndServices',
        href: '/app/items',
        icon: Boxes,
      },
      {
        type: 'item',
        label: 'Invoices',
        key: 'common.invoices',
        href: '/app/invoices',
        icon: FilePenLine,
      },
    ],
  },
] as const satisfies RouteConfig[];
