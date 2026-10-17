import { requirePermission } from "@/lib/permissions/server";
import SubscriptionsLayoutClient from "./subscriptions-layout-client";

export default async function SubscriptionsLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  await requirePermission("subscription:read");
  return <SubscriptionsLayoutClient>{children}</SubscriptionsLayoutClient>;
}
