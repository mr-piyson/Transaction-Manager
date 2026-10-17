import { requirePermission } from "@/lib/permissions/server";

export default async function PermissionsSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Route-level guard: managing roles/permissions requires role:manage.
  await requirePermission("role:manage");
  return <>{children}</>;
}
