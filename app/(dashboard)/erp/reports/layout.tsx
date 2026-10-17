import { requirePermission } from "@/lib/permissions/server";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Any report permission grants access to the reports hub; each report narrows
  // further through its own tRPC procedure checks.
  await requirePermission([
    "report:financial",
    "report:inventory",
    "report:sales",
  ]);
  return <>{children}</>;
}
