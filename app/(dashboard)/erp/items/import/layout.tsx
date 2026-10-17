import { requirePermission } from "@/lib/permissions/server";

export default async function ItemImportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Importing creates items → require item:create on top of the item:read guard
  // inherited from the items layout.
  await requirePermission("item:create");
  return <>{children}</>;
}
