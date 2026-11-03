/**
 * Deep-link resolver for notification targets. Runs on both server and client
 * (no imports), so NotificationBell, the notifications page, and backend
 * producers all share one mapping — add new entity types here only.
 */
export function getNotificationEntityPath(
  entityType: string | null | undefined,
  entityId: string | null | undefined,
): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case "Invoice":
      return `/erp/invoices/${entityId}`;
    case "PurchaseOrder":
      return `/erp/purchase-orders/${entityId}`;
    case "Subscription":
      return `/erp/subscriptions/${entityId}`;
    case "Contract":
      return `/erp/contracts/${entityId}`;
    default:
      return null;
  }
}
