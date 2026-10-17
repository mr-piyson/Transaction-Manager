import { requirePermission } from "@/lib/permissions/server";
import SettingsLayoutClient from "./settings-layout-client";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("org:settings:read");
  return <SettingsLayoutClient>{children}</SettingsLayoutClient>;
}
