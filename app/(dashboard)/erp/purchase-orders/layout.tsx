"use client";

import POLayout from "./po-layout";

export default function PurchaseOrdersLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  return <POLayout>{children}</POLayout>;
}
