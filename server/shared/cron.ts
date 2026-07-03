import * as cron from 'node-cron';
import db from '@/lib/db';
import { createNotification, NOTIFICATION_SETTINGS_KEYS, NOTIFICATION_TYPES } from '../notifications/notifications.shared';

function shouldRun(jobName: string): boolean {
  return process.env[`CRON_${jobName.toUpperCase().replace(/-/g, '_')}_DISABLED`] !== 'true';
}

// Every hour: check for overdue invoices
async function checkOverdueInvoices() {
  const now = new Date();

  const overdueInvoices = await db.invoice.findMany({
    where: {
      status: { in: ['SENT', 'PARTIAL'] },
      paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      dueDate: { not: null, lt: now },
      deletedAt: null,
    },
    select: {
      id: true,
      serial: true,
      dueDate: true,
      createdById: true,
      organizationId: true,
    },
  });

  const existingNotifications = await db.notification.findMany({
    where: {
      type: NOTIFICATION_TYPES.OVERDUE,
      entityType: 'Invoice',
      entityId: { in: overdueInvoices.map((i) => i.id) },
      status: { in: ['UNREAD', 'READ'] },
    },
    select: { entityId: true },
  });

  const existingIds = new Set(existingNotifications.map((n) => n.entityId));

  for (const invoice of overdueInvoices) {
    if (existingIds.has(invoice.id)) continue;

    const setting = await db.organizationSetting.findFirst({
      where: {
        organizationId: invoice.organizationId,
        key: NOTIFICATION_SETTINGS_KEYS[NOTIFICATION_TYPES.OVERDUE],
      },
      select: { value: true },
    });

    await db.$transaction(async (tx) => {
      await createNotification(tx, setting?.value === 'true', {
        title: 'Invoice Overdue',
        body: `${invoice.serial} is overdue (due ${invoice.dueDate?.toLocaleDateString()}).`,
        type: NOTIFICATION_TYPES.OVERDUE,
        entityType: 'Invoice',
        entityId: invoice.id,
        userId: invoice.createdById,
        organizationId: invoice.organizationId,
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: 'OVERDUE' },
      });
    });
  }

  if (overdueInvoices.length > 0) {
    console.log(`[cron] Checked overdue invoices: ${overdueInvoices.length} found`);
  }
}

// Every 6 hours: check for low stock items
async function checkLowStock() {
  const items = await db.item.findMany({
    where: {
      reorderPoint: { gt: 0 },
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      sku: true,
      reorderPoint: true,
      organizationId: true,
    },
  });

  const stockAggs = await db.stock.groupBy({
    by: ['itemId'],
    where: { itemId: { in: items.map((i) => i.id) } },
    _sum: { quantity: true },
  });

  const stockMap = new Map<string, number>();
  for (const row of stockAggs) {
    stockMap.set(row.itemId, Number(row._sum.quantity ?? 0));
  }

  const lowStockItems = items.filter((item) => {
    const totalStock = stockMap.get(item.id) ?? 0;
    return totalStock <= item.reorderPoint;
  });

  if (lowStockItems.length === 0) return;

  const existingNotifications = await db.notification.findMany({
    where: {
      type: NOTIFICATION_TYPES.LOW_STOCK,
      entityType: 'Item',
      entityId: { in: lowStockItems.map((i) => i.id) },
      status: { in: ['UNREAD', 'READ'] },
    },
    select: { entityId: true },
  });

  const existingIds = new Set(existingNotifications.map((n) => n.entityId));

  for (const item of lowStockItems) {
    if (existingIds.has(item.id)) continue;

    const setting = await db.organizationSetting.findFirst({
      where: {
        organizationId: item.organizationId,
        key: NOTIFICATION_SETTINGS_KEYS[NOTIFICATION_TYPES.LOW_STOCK],
      },
      select: { value: true },
    });

    await db.$transaction(async (tx) => {
      const orgUsers = await tx.user.findMany({
        where: { organizationId: item.organizationId },
        select: { id: true },
      });

      for (const user of orgUsers) {
        await createNotification(tx, setting?.value === 'true', {
          title: 'Low Stock',
          body: `${item.name} (${item.sku}) is low on stock (reorder point: ${item.reorderPoint}).`,
          type: NOTIFICATION_TYPES.LOW_STOCK,
          entityType: 'Item',
          entityId: item.id,
          userId: user.id,
          organizationId: item.organizationId,
        });
      }
    });
  }

  console.log(`[cron] Checked low stock: ${lowStockItems.length} items low`);
}

export function registerCronJobs() {
  if (shouldRun('overdue')) {
    cron.schedule('0 * * * *', () => {
      checkOverdueInvoices().catch((err) => console.error('[cron] overdue check failed:', err));
    });
    console.log('[cron] Registered overdue invoice check (hourly)');
  }

  if (shouldRun('low-stock')) {
    cron.schedule('0 */6 * * *', () => {
      checkLowStock().catch((err) => console.error('[cron] low stock check failed:', err));
    });
    console.log('[cron] Registered low stock check (every 6 hours)');
  }
}
