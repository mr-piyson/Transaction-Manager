import * as cron from 'node-cron';
import db from '@/lib/db';
import { createNotification, NOTIFICATION_SETTINGS_KEYS, NOTIFICATION_TYPES } from '../notifications/notifications.shared';
import { fullSyncCurrenciesAndRates } from './frankfurter';

function shouldRun(jobName: string): boolean {
  return process.env[`CRON_${jobName.toUpperCase().replace(/-/g, '_')}_DISABLED`] !== 'true';
}

const SYNC_SETTINGS_KEYS = {
  ENABLED: 'currencySyncEnabled',
  FREQUENCY: 'currencySyncFrequency',
  LAST_SYNCED: 'currencyLastSyncedAt',
} as const;

// Active scheduled tasks for dynamic rescheduling
const activeTasks: Map<string, cron.ScheduledTask> = new Map();

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

// Exchange rate sync job
async function syncExchangeRates() {
  const orgs = await db.organization.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      currency: true,
    },
  });

  let totalSynced = 0;

  for (const org of orgs) {
    // Check if sync is enabled for this org
    const syncEnabled = await db.organizationSetting.findFirst({
      where: {
        organizationId: org.id,
        key: SYNC_SETTINGS_KEYS.ENABLED,
      },
      select: { value: true },
    });

    if (syncEnabled?.value !== 'true') continue;

    if (!org.currency) continue;

    try {
      // Use the centralized full sync function
      const result = await fullSyncCurrenciesAndRates(org.currency, org.id);

      // Update last synced timestamp
      await db.organizationSetting.upsert({
        where: {
          organizationId_key: {
            organizationId: org.id,
            key: SYNC_SETTINGS_KEYS.LAST_SYNCED,
          },
        },
        create: {
          organizationId: org.id,
          key: SYNC_SETTINGS_KEYS.LAST_SYNCED,
          value: new Date().toISOString(),
        },
        update: { value: new Date().toISOString() },
      });

      totalSynced++;
    } catch (error) {
      console.error(`[cron] Exchange rate sync failed for org ${org.id}:`, error);
    }
  }

  if (totalSynced > 0) {
    console.log(`[cron] Synced exchange rates for ${totalSynced} organizations`);
  }
}

async function getSyncFrequency(): Promise<string> {
  // Get the most common frequency setting across all orgs
  // Default to daily if no settings exist
  const frequencies = await db.organizationSetting.groupBy({
    by: ['value'],
    where: {
      key: SYNC_SETTINGS_KEYS.FREQUENCY,
    },
    _count: true,
  });

  if (frequencies.length === 0) return '0 0 * * *'; // daily

  // Get the most common frequency
  const mostCommon = frequencies.reduce((prev, curr) =>
    curr._count > prev._count ? curr : prev
  );

  switch (mostCommon.value) {
    case 'weekly':
      return '0 0 * * 0';
    case 'monthly':
      return '0 0 1 * *';
    default:
      return '0 0 * * *'; // daily
  }
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

  if (shouldRun('currency-sync')) {
    getSyncFrequency().then((frequency) => {
      const task = cron.schedule(frequency, () => {
        syncExchangeRates().catch((err) => console.error('[cron] currency sync failed:', err));
      });
      activeTasks.set('currency-sync', task);
      console.log(`[cron] Registered exchange rate sync (${frequency})`);
    });
  }
}

/**
 * Restart the currency sync job with a new frequency
 * Called when user updates sync settings
 */
export async function restartCurrencySync(frequency: string): Promise<void> {
  // Stop existing task if running
  const existingTask = activeTasks.get('currency-sync');
  if (existingTask) {
    existingTask.stop();
    activeTasks.delete('currency-sync');
  }

  // Schedule new task
  const task = cron.schedule(frequency, () => {
    syncExchangeRates().catch((err) => console.error('[cron] currency sync failed:', err));
  });
  activeTasks.set('currency-sync', task);
  console.log(`[cron] Restarted exchange rate sync with frequency: ${frequency}`);
}

/**
 * Manually trigger exchange rate sync
 */
export async function triggerCurrencySync(): Promise<{ success: boolean; ratesUpdated: number }> {
  try {
    await syncExchangeRates();
    return { success: true, ratesUpdated: 0 }; // TODO: return actual count
  } catch (error) {
    console.error('[cron] Manual currency sync failed:', error);
    return { success: false, ratesUpdated: 0 };
  }
}
