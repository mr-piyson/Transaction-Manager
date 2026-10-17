import { requirePermission } from "@/lib/permissions/server";
import IncomesLayoutClient from "./incomes-layout-client";

export default async function IncomesLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  await requirePermission("income:read");
  return <IncomesLayoutClient>{children}</IncomesLayoutClient>;
}
