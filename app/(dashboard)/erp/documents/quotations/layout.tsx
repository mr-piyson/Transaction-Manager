import DocumentsLayout from "@/components/documents/document-layout";
import { requirePermission } from "@/lib/permissions/server";

export default async function QuotationsLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  // Quotations are Invoice rows (type = QUOTE) → invoice:read.
  await requirePermission("invoice:read");
  return (
    <DocumentsLayout documentType="quotations">{children}</DocumentsLayout>
  );
}
