export type RouteConfig = {
  title: string;
  path: string;
  icon: string;
  children?: Record<string, RouteConfig>;
};

export const routes = {
  notes: {
    title: "Notes",
    path: "/app/notes",
    icon: "icon-[mage--note]",
  },
  settings: {
    title: "Settings",
    path: "/app/settings",
    icon: "icon-[solar--settings-linear]",
    children: {
      profile: {
        title: "Profile",
        path: "/app/settings/profile",
        icon: "icon-[solar--user-circle-linear]",
      },
      account: {
        title: "User Accounts",
        path: "/app/settings/account",
        icon: "icon-[ic--outline-manage-accounts]",
      },
      departments: {
        title: "Departments",
        path: "/app/settings/departments",
        icon: "icon-[solar--buildings-2-line-duotone]",
      },
      security: {
        title: "Security",
        path: "/app/settings/security",
        icon: "icon-[lucide--shield]",
      },
      appearance: {
        title: "Appearance",
        path: "/app/settings/appearance",
        icon: "icon-[lucide--palette]",
      },
    },
  },
  customers: {
    title: "Customers",
    path: "/app/customers",
    icon: "icon-[solar--user-broken]",
  },
} as const;

export type Route = {
  title: string;
  path: string;
  icon: string;
};

// return only top-level routes
export function getTopLevelRoutes(routes: Record<string, RouteConfig>): Route[] {
  return Object.values(routes).map(r => ({
    title: r.title,
    path: r.path,
    icon: r.icon,
  }));
}
