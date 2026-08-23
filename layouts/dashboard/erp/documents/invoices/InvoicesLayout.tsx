"use client";

import DocumentsLayout from "../[type]/TypeLayout";

export default function InvoicesLayout({
	children,
}: {
	children?: React.ReactNode;
}) {
	return <DocumentsLayout documentType="invoices">{children}</DocumentsLayout>;
}
