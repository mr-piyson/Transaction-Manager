import { orgProcedure, router } from "@/lib/trpc/context";
import { countLowStockItems } from "../shared/low-stock";

const DEFAULT_TIMEZONE = "Asia/Bahrain";

/** Invoice statuses in the order the dashboard shows them. */
const INVOICE_STATUS_ORDER = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SENT",
  "INVOICED",
  "PARTIAL",
  "PAID",
  "OVERDUE",
  "DISPUTED",
  "CANCELLED",
] as const;

const INVOICE_COUNT_EXCLUDED_STATUSES = ["CANCELLED", "DELETED"] as const;

/** A PO is "open" while it still needs work before it is fully settled. */
const OPEN_PO_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "ORDERED",
  "PARTIAL_RECEIVED",
] as const;

/** The purchase-order module badge counts everything except terminal states. */
const PO_MODULE_EXCLUDED_STATUSES = ["CANCELLED", "CLOSED"] as const;

function resolveTimeZone(value: string | null | undefined): string {
  const candidate = value?.trim() || DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(
      new Date(),
    );
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getPartsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    partsFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const values = getPartsFormatter(timeZone).formatToParts(date);
  const lookup = new Map(values.map((part) => [part.type, part.value]));

  return {
    year: Number(lookup.get("year")),
    month: Number(lookup.get("month")),
    day: Number(lookup.get("day")),
    hour: Number(lookup.get("hour")),
    minute: Number(lookup.get("minute")),
    second: Number(lookup.get("second")),
  };
}

function offsetMsAt(instant: Date, timeZone: string): number {
  const parts = zonedParts(instant, timeZone);
  const wallClockAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return wallClockAsUtc - instant.getTime();
}

/**
 * Converts a wall-clock time in `timeZone` to the matching UTC instant.
 * Doing this per boundary (instead of adding fixed 24-hour windows) keeps the
 * month and week buckets correct across DST changes.
 */
function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string,
  hour = 0,
): Date {
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour);
  let instant = wallClockAsUtc;

  // Two passes converge across a DST boundary where the offset changes.
  for (let pass = 0; pass < 2; pass++) {
    instant = wallClockAsUtc - offsetMsAt(new Date(instant), timeZone);
  }

  return new Date(instant);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = zonedParts(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

interface WeekRange {
  start: Date;
  end: Date;
  days: string[];
}

/** Monday-to-Sunday week containing "today" in the user's timezone. */
function currentWeekRange(nowParts: ZonedParts, timeZone: string): WeekRange {
  const localDateAsUtc = new Date(
    Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day),
  );
  const mondayOffset = (localDateAsUtc.getUTCDay() + 6) % 7;

  const mondayAsUtc = new Date(
    Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day - mondayOffset),
  );
  const nextMondayAsUtc = new Date(
    Date.UTC(
      nowParts.year,
      nowParts.month - 1,
      nowParts.day - mondayOffset + 7,
    ),
  );

  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(
      Date.UTC(
        nowParts.year,
        nowParts.month - 1,
        nowParts.day - mondayOffset + index,
      ),
    );
    return `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`;
  });

  return {
    start: zonedDateTimeToUtc(
      mondayAsUtc.getUTCFullYear(),
      mondayAsUtc.getUTCMonth() + 1,
      mondayAsUtc.getUTCDate(),
      timeZone,
    ),
    end: zonedDateTimeToUtc(
      nextMondayAsUtc.getUTCFullYear(),
      nextMondayAsUtc.getUTCMonth() + 1,
      nextMondayAsUtc.getUTCDate(),
      timeZone,
    ),
    days,
  };
}

function buildWeekBuckets(
  days: string[],
  invoices: { date: Date }[],
  purchaseOrders: { date: Date }[],
  timeZone: string,
) {
  const buckets = new Map(
    days.map((dayKey) => [dayKey, { dayKey, invoices: 0, pos: 0 }]),
  );

  for (const invoice of invoices) {
    const bucket = buckets.get(dateKeyInTimeZone(invoice.date, timeZone));
    if (bucket) bucket.invoices += 1;
  }

  for (const order of purchaseOrders) {
    const bucket = buckets.get(dateKeyInTimeZone(order.date, timeZone));
    if (bucket) bucket.pos += 1;
  }

  return days.map(
    (dayKey) => buckets.get(dayKey) ?? { dayKey, invoices: 0, pos: 0 },
  );
}

export const dashboardRouter = router({
  /**
   * Permission-aware dashboard counts.
   *
   * The /erp landing page is open to every organization member, but the data
   * behind each section is not. Sections the caller cannot read are returned
   * as `null` so the UI can explain the restriction instead of showing a
   * misleading zero.
   */
  overview: orgProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.user.organizationId;
    const timeZone = resolveTimeZone(ctx.user.timezone);
    const now = new Date();
    const nowParts = zonedParts(now, timeZone);

    const can = {
      invoices: ctx.ability.can("invoice:read", "Invoice"),
      purchaseOrders: ctx.ability.can("po:read", "PurchaseOrder"),
      items: ctx.ability.can("item:read", "Item"),
      customers: ctx.ability.can("customer:read", "Customer"),
      suppliers: ctx.ability.can("supplier:read", "Supplier"),
      stock: ctx.ability.can("stock:read", "Stock"),
      createInvoice: ctx.ability.can("invoice:create", "Invoice"),
      createPurchaseOrder: ctx.ability.can("po:create", "PurchaseOrder"),
      createCustomer: ctx.ability.can("customer:create", "Customer"),
      createIncome: ctx.ability.can("income:create", "Income"),
    };

    const currentMonthStart = zonedDateTimeToUtc(
      nowParts.year,
      nowParts.month,
      1,
      timeZone,
    );
    const nextMonthStart = zonedDateTimeToUtc(
      nowParts.year,
      nowParts.month + 1,
      1,
      timeZone,
    );
    const lastMonthStart = zonedDateTimeToUtc(
      nowParts.year,
      nowParts.month - 1,
      1,
      timeZone,
    );
    const week = currentWeekRange(nowParts, timeZone);

    const [
      invoiceCounts,
      purchaseOrderCounts,
      statusMix,
      inventory,
      invoiceModuleCount,
      purchaseOrderModuleCount,
      customerCount,
      supplierCount,
      weekInvoices,
      weekPurchaseOrders,
    ] = await Promise.all([
      can.invoices
        ? Promise.all([
            ctx.db.invoice.count({
              where: {
                organizationId,
                type: "INVOICE",
                deletedAt: null,
                status: { notIn: [...INVOICE_COUNT_EXCLUDED_STATUSES] },
                date: { gte: currentMonthStart, lt: nextMonthStart },
              },
            }),
            ctx.db.invoice.count({
              where: {
                organizationId,
                type: "INVOICE",
                deletedAt: null,
                status: { notIn: [...INVOICE_COUNT_EXCLUDED_STATUSES] },
                date: { gte: lastMonthStart, lt: currentMonthStart },
              },
            }),
          ]).then(([thisMonth, lastMonth]) => ({ thisMonth, lastMonth }))
        : Promise.resolve(null),
      can.purchaseOrders
        ? Promise.all([
            ctx.db.purchaseOrder.count({
              where: {
                organizationId,
                deletedAt: null,
                status: "PENDING_APPROVAL",
              },
            }),
            ctx.db.purchaseOrder.count({
              where: {
                organizationId,
                deletedAt: null,
                status: { in: [...OPEN_PO_STATUSES] },
              },
            }),
          ]).then(([pendingApproval, open]) => ({ pendingApproval, open }))
        : Promise.resolve(null),
      can.invoices
        ? ctx.db.invoice
            .groupBy({
              by: ["status"],
              where: {
                organizationId,
                type: "INVOICE",
                deletedAt: null,
              },
              _count: { _all: true },
            })
            .then((rows) => {
              const counts = new Map(
                rows.map((row) => [row.status, row._count._all]),
              );

              return INVOICE_STATUS_ORDER.map((status) => ({
                status,
                count: counts.get(status) ?? 0,
              })).filter((row) => row.count > 0);
            })
        : Promise.resolve(null),
      can.items || can.stock
        ? Promise.all([
            ctx.db.item.count({
              where: { organizationId, isActive: true, deletedAt: null },
            }),
            ctx.db.item.count({
              where: {
                organizationId,
                isActive: true,
                deletedAt: null,
                type: { not: "SERVICE" },
              },
            }),
            ctx.db.item.count({
              where: {
                organizationId,
                isActive: true,
                deletedAt: null,
                type: { not: "SERVICE" },
                reorderPoint: { gt: 0 },
              },
            }),
            countLowStockItems(ctx.db, organizationId),
          ]).then(
            ([totalItems, trackedItems, reorderPointItems, lowStock]) => ({
              totalItems,
              trackedItems,
              reorderPointItems,
              lowStock,
            }),
          )
        : Promise.resolve(null),
      can.invoices
        ? ctx.db.invoice.count({
            where: {
              organizationId,
              type: "INVOICE",
              deletedAt: null,
              status: { notIn: [...INVOICE_COUNT_EXCLUDED_STATUSES] },
            },
          })
        : Promise.resolve(null),
      can.purchaseOrders
        ? ctx.db.purchaseOrder.count({
            where: {
              organizationId,
              deletedAt: null,
              status: { notIn: [...PO_MODULE_EXCLUDED_STATUSES] },
            },
          })
        : Promise.resolve(null),
      can.customers
        ? ctx.db.customer.count({
            where: { organizationId, isActive: true, deletedAt: null },
          })
        : Promise.resolve(null),
      can.suppliers
        ? ctx.db.supplier.count({
            where: {
              organizationId,
              isActive: true,
              deletedAt: null,
              isSystem: false,
            },
          })
        : Promise.resolve(null),
      can.invoices
        ? ctx.db.invoice.findMany({
            where: {
              organizationId,
              type: "INVOICE",
              deletedAt: null,
              date: { gte: week.start, lt: week.end },
            },
            select: { date: true },
          })
        : Promise.resolve([]),
      can.purchaseOrders
        ? ctx.db.purchaseOrder.findMany({
            where: {
              organizationId,
              deletedAt: null,
              date: { gte: week.start, lt: week.end },
            },
            select: { date: true },
          })
        : Promise.resolve([]),
    ]);

    return {
      timeZone,
      can,
      invoices: invoiceCounts,
      purchaseOrders: purchaseOrderCounts,
      statusMix,
      inventory,
      modules: {
        invoices: invoiceModuleCount,
        purchaseOrders: purchaseOrderModuleCount,
        items: can.items && inventory ? inventory.totalItems : null,
        customers: customerCount,
        suppliers: supplierCount,
        stock: can.stock && inventory ? inventory.lowStock : null,
      },
      week:
        can.invoices || can.purchaseOrders
          ? buildWeekBuckets(
              week.days,
              weekInvoices,
              weekPurchaseOrders,
              timeZone,
            )
          : null,
    };
  }),
});
