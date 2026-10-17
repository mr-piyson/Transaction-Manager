import { requirePermission } from "@/lib/permissions/server";
import SuppliersLayoutClient from "./suppliers-layout-client";

export default async function SuppliersLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  await requirePermission("supplier:read");
  return <SuppliersLayoutClient>{children}</SuppliersLayoutClient>;
}
