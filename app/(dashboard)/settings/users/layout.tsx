import { requirePermission } from "@/lib/permissions/server";

export default async function UsersSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Route-level guard: managing users requires user:manage.
  await requirePermission("user:manage");
  return <>{children}</>;
}
