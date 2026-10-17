"use client";

import DocumentsLayout from "@/components/documents/document-layout";

export default function QuotationsLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <DocumentsLayout documentType="quotations">{children}</DocumentsLayout>
  );
}
