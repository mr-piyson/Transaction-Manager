import DocumentsLayout from "@/components/documents/document-layout";
import { requirePermission } from "@/lib/permissions/server";

export default async function InvoicesLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  // Route-level guard (server): the tRPC layer enforces invoice:read too.
  await requirePermission("invoice:read");
  return <DocumentsLayout documentType="invoices">{children}</DocumentsLayout>;
}
