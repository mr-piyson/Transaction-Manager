// Make Activities for each role of the user
// import { Account } from "@prisma/client";

export const Activities = () => [
  {
    title: "Notes",
    url: "/app/notes",
    icon: "icon-[mage--note]",
  },
  {
    title: "Settings",
    url: "/app/settings",
    icon: "icon-[solar--settings-linear]",
  },
  {
    title: "Customers",
    url: "/app/customers",
    icon: "icon-[mdi--account-multiple]",
  },
];

export const settingsNavItems = [
  {
    title: "Profile",
    href: "/app/settings/profile",
    icon: "icon-[solar--user-circle-linear]",
  },
  {
    title: "User Accounts",
    href: "/app/settings/account",
    icon: "icon-[ic--outline-manage-accounts]",
  },
  {
    title: "Departments",
    href: "/app/settings/departments",
    icon: "icon-[solar--buildings-2-line-duotone]",
  },
  {
    title: "Security",
    href: "/app/settings/security",
    icon: "icon-[lucide--shield]",
  },
  {
    title: "Appearance",
    href: "/app/settings/appearance",
    icon: "icon-[lucide--palette]",
  },
];
