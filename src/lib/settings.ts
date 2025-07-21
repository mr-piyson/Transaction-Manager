import { CreditCard, User, Lock, Palette, CarFront } from "lucide-react";

export const settingsNavItems = [
  {
    title: "Profile",
    href: "/App/Settings/Profile",
    icon: User,
  },
  {
    title: "Account",
    href: "/App/Settings/Account",
    icon: CreditCard,
  },
  {
    title: "Vehicles",
    href: "/App/Settings/Vehicles",
    icon: CarFront,
  },
  {
    title: "Security",
    href: "/App/Settings/Security",
    icon: Lock,
  },
  {
    title: "Appearance",
    href: "/App/Settings/Appearance",
    icon: Palette,
  },
];
