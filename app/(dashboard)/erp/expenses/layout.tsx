import { requirePermission } from "@/lib/permissions/server";
import ExpensesLayoutClient from "./expenses-layout-client";

export default async function ExpensesLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  await requirePermission("expense:read");
  return <ExpensesLayoutClient>{children}</ExpensesLayoutClient>;
}
