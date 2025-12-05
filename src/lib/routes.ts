import { TranslationKeys } from "./i18n/i18n-core";

export type RouteConfig = {
  key: TranslationKeys;
  title: string;
  path: string;
  icon: string;
  children?: Record<string, RouteConfig>;
};

// Define the routes as a const to get literal types
export const routes = {
  settings: {
    key: "routes.settings",
    title: "Settings",
    path: "/app/settings",
    icon: "icon-[solar--settings-linear]",
    children: {
      profile: {
        key: "routes.settings.profile",
        title: "Profile",
        path: "/app/settings/profile",
        icon: "icon-[solar--user-circle-linear]",
      },
      account: {
        key: "routes.settings.account",
        title: "User Accounts",
        path: "/app/settings/account",
        icon: "icon-[ic--outline-manage-accounts]",
      },
      departments: {
        key: "routes.settings.departments",
        title: "Departments",
        path: "/app/settings/departments",
        icon: "icon-[solar--buildings-2-line-duotone]",
      },
      security: {
        key: "routes.settings.security",
        title: "Security",
        path: "/app/settings/security",
        icon: "icon-[lucide--shield]",
      },
      appearance: {
        key: "routes.settings.appearance",
        title: "Appearance",
        path: "/app/settings/appearance",
        icon: "icon-[lucide--palette]",
      },
    },
  },
  customers: {
    key: "routes.customers",
    title: "Customers",
    path: "/app/customers",
    icon: "icon-[solar--user-broken]",
  },
} as const;

// Derive a type from the const
export type Routes = typeof routes;

export type Route = { title: string; path: string; icon: string };

/**
 * Get top-level routes using an optional selector
 */
export function getTopLevel(selector?: (allRoutes: typeof routes) => RouteConfig): Route[] {
  const selectedRoutes = selector ? Object.values(selector(routes).children ?? {}) : Object.values(routes);

  return selectedRoutes.map(r => ({
    title: r.title,
    path: r.path,
    icon: r.icon,
  }));
}
