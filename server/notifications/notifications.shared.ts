import type { Prisma } from '@prisma/client';

export const NOTIFICATION_TYPES = {
  APPROVAL_REQUEST: 'approval_request',
  INVOICE_APPROVED: 'invoice_approved',
  INVOICE_REJECTED: 'invoice_rejected',
  INVOICE_SENT: 'invoice_sent',
  INVOICE_CANCELLED: 'invoice_cancelled',
  PAYMENT_RECEIVED: 'payment_received',
  PO_APPROVED: 'po_approved',
  PO_REJECTED: 'po_rejected',
  PO_ORDERED: 'po_ordered',
  PO_RECEIVED: 'po_received',
  PO_CANCELLED: 'po_cancelled',
  LOW_STOCK: 'low_stock',
  OVERDUE: 'overdue',
  INVOICE_CONVERTED: 'invoice_converted',
  PAYMENT_DELETED: 'payment_deleted',
} as const;

export const NOTIFICATION_SETTINGS_KEYS = {
  [NOTIFICATION_TYPES.APPROVAL_REQUEST]: 'notify_approval_request',
  [NOTIFICATION_TYPES.INVOICE_APPROVED]: 'notify_invoice_approved',
  [NOTIFICATION_TYPES.INVOICE_REJECTED]: 'notify_invoice_rejected',
  [NOTIFICATION_TYPES.INVOICE_SENT]: 'notify_invoice_sent',
  [NOTIFICATION_TYPES.INVOICE_CANCELLED]: 'notify_invoice_cancelled',
  [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: 'notify_payment_received',
  [NOTIFICATION_TYPES.PO_APPROVED]: 'notify_po_approved',
  [NOTIFICATION_TYPES.PO_REJECTED]: 'notify_po_rejected',
  [NOTIFICATION_TYPES.PO_ORDERED]: 'notify_po_ordered',
  [NOTIFICATION_TYPES.PO_RECEIVED]: 'notify_po_received',
  [NOTIFICATION_TYPES.PO_CANCELLED]: 'notify_po_cancelled',
  [NOTIFICATION_TYPES.LOW_STOCK]: 'notify_low_stock',
  [NOTIFICATION_TYPES.OVERDUE]: 'notify_overdue',
  [NOTIFICATION_TYPES.INVOICE_CONVERTED]: 'notify_invoice_converted',
  [NOTIFICATION_TYPES.PAYMENT_DELETED]: 'notify_payment_deleted',
} as const;

export function getNotificationEntityPath(
  entityType: string | null | undefined,
  entityId: string | null | undefined,
): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case 'Invoice':
      return `/erp/invoices/${entityId}`;
    case 'PurchaseOrder':
      return `/erp/purchase-orders/${entityId}`;
    default:
      return null;
  }
}

export type NotificationCreateInput = {
  title: string;
  body: string;
  type: string;
  entityType: string;
  entityId: string;
  userId: string;
  organizationId: string;
};

export async function createNotification(
  tx: Prisma.TransactionClient,
  settingsEnabled: boolean | undefined,
  input: NotificationCreateInput,
) {
  if (!settingsEnabled && settingsEnabled !== undefined) return;
  await tx.notification.create({ data: input });
}
