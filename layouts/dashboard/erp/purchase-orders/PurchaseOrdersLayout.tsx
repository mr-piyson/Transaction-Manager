"use client";

import POLayout from "../documents/po/TypeLayout";

export default function PurchaseOrdersLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  return <POLayout>{children}</POLayout>;
}