import { requirePermission } from "@/lib/permissions/server";
import CustomersLayoutClient from "./customers-layout-client";

export default async function CustomersLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  await requirePermission("customer:read");
  return <CustomersLayoutClient>{children}</CustomersLayoutClient>;
}
