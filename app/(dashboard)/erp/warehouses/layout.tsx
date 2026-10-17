import { requirePermission } from "@/lib/permissions/server";
import WarehousesLayoutClient from "./warehouses-layout-client";

export default async function WarehousesLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  await requirePermission("warehouse:read");
  return <WarehousesLayoutClient>{children}</WarehousesLayoutClient>;
}
