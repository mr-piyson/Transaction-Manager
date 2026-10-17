import { requirePermission } from "@/lib/permissions/server";
import ItemsLayoutClient from "./items-layout-client";

export default async function ItemsLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  await requirePermission("item:read");
  return <ItemsLayoutClient>{children}</ItemsLayoutClient>;
}
