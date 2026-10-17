import { requirePermission } from "@/lib/permissions/server";
import ContractsLayoutClient from "./contracts-layout-client";

export default async function ContractsLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  // Contracts reuse invoicing permissions (matching server/contracts).
  await requirePermission("invoice:read");
  return <ContractsLayoutClient>{children}</ContractsLayoutClient>;
}
