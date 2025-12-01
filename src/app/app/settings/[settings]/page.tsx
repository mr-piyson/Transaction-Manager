"use client";

import { useParams } from "next/navigation";

import { AccountSettings } from "@/app/app/settings/Account-settings";
import { AppearanceSettings } from "@/app/app/settings/Appearance-settings";
import { ProfileSettings } from "@/app/app/settings/Profile/Profile-settings";
import { SecuritySettings } from "@/app/app/settings/Security-settings";

export default function SettingsTab() {
  const pathname = useParams();
  switch (pathname.settings) {
    case "accounts":
      return <AccountSettings />;
    case "security":
      return <SecuritySettings />;
    case "appearance":
      return <AppearanceSettings />;
    case "profile":
      return <ProfileSettings />;
    default:
      return <ProfileSettings />;
  }
}
