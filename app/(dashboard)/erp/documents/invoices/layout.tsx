"use client";

import DocumentsLayout from "@/components/documents/document-layout";

export default function InvoicesLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  return <DocumentsLayout documentType="invoices">{children}</DocumentsLayout>;
}
