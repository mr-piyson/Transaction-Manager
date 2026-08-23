"use client";

import DocumentsLayout from "../[type]/TypeLayout";

export default function QuotationsLayout({
	children,
}: {
	children?: React.ReactNode;
}) {
	return (
		<DocumentsLayout documentType="quotations">{children}</DocumentsLayout>
	);
}
