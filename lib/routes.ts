import { TranslationKeys } from "@/i18n/config";
import { Route } from "next";

// 1. Define what a single route looks like
export type RouteConfig = {
  key: TranslationKeys;
  path: Route;
  icon: string;
  children?: Record<string, RouteConfig>;
};

// Derive a type from the const
export type Routes = typeof routes;

// 2. Define the container type (a map of RouteConfigs)
export type RouteMap = Record<string, RouteConfig>;

// Define the routes as a const to get literal types
export const routes = {
  settings: {
    key: "common.settings",
    path: "/app/settings",
    icon: "icon-[solar--settings-linear]",
    // children: {
    //   profile: {
    //     key: "common.profile",
    //     path: "/app/settings/profile",
    //     icon: "icon-[solar--user-circle-linear]",
    //   },
    //   account: {
    //     key: "common.account",
    //     path: "/app/settings/account",
    //     icon: "icon-[ic--outline-manage-accounts]",
    //   },
    //   departments: {
    //     key: "common.departments",
    //     path: "/app/settings/departments",
    //     icon: "icon-[solar--buildings-2-line-duotone]",
    //   },
    //   security: {
    //     key: "common.security",
    //     path: "/app/settings/security",
    //     icon: "icon-[lucide--shield]",
    //   },
    //   appearance: {
    //     key: "common.appearance",
    //     path: "/app/settings/appearance",
    //     icon: "icon-[lucide--palette]",
    //   },
    // },
  },
  customers: {
    key: "common.customers",
    path: "",
    icon: "icon-[lucide--user]",
  },
  inventory: {
    key: "common.inventory",
    path: "/app/inventory",
    icon: "icon-[streamline-plump--computer-pc-desktop]",
  },
  invoices: {
    key: "common.invoices",
    path: "/app/invoices",
    icon: "icon-[lucide--file-text]",
  },
} as const satisfies RouteMap;

export const sidebarRoutes = [
  routes.customers,
  routes.inventory,
  routes.invoices,
];
