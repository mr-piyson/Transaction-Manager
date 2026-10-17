import { requirePermission } from "@/lib/permissions/server";
import StockLayoutClient from "./stock-layout-client";

export default async function StockLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  await requirePermission("stock:read");
  return <StockLayoutClient>{children}</StockLayoutClient>;
}
