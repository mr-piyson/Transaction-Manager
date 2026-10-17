import { requirePermission } from "@/lib/permissions/server";
import POLayout from "./po-layout";

export default async function PurchaseOrdersLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  await requirePermission("po:read");
  return <POLayout>{children}</POLayout>;
}
