/**
 * reports.ts
 * Financial statements & operational reports.
 * All queries are scoped to the caller's organizationId.
 *
 * Reports implemented:
 *  - AR aging
 *  - AP aging
 *  - Revenue by period
 *  - Cost of goods sold
 *  - Gross profit
 *  - Cash flow (by date & method)
 *  - Low-stock report
 */

import { z } from 'zod';
import { protectedProcedure, t } from '@/lib/trpc/server';
import { requireOrgId } from './_shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ageBucket(date: Date): '0-30' | '31-60' | '61-90' | '90+' {
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

const AGE_BUCKETS = ['0-30', '31-60', '61-90', '90+'] as const;
type AgeBucket = (typeof AGE_BUCKETS)[number];

const periodSchema = z.enum(['month', 'quarter', 'year']).default('month');
const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const reportsRouter = t.router({
  // =========================================================================
  // AR AGING — Outstanding invoice balances by age bucket
  // =========================================================================
  arAging: protectedProcedure.input(dateRangeSchema).query(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const invoices = await ctx.prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        type: 'INVOICE',
        status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] },
        ...(input.from || input.to
          ? { date: { ...(input.from && { gte: input.from }), ...(input.to && { lte: input.to }) } }
          : {}),
      },
      select: {
        id: true,
        serial: true,
        date: true,
        dueDate: true,
        total: true,
        amountDue: true,
        customer: { select: { id: true, name: true } },
      },
    });

    // Group by age bucket
    const buckets: Record<AgeBucket, { count: number; total: bigint; invoices: typeof invoices }> =
      {
        '0-30': { count: 0, total: BigInt(0), invoices: [] },
        '31-60': { count: 0, total: BigInt(0), invoices: [] },
        '61-90': { count: 0, total: BigInt(0), invoices: [] },
        '90+': { count: 0, total: BigInt(0), invoices: [] },
      };

    for (const inv of invoices) {
      const bucket = ageBucket(inv.dueDate ?? inv.date);
      buckets[bucket].count++;
      buckets[bucket].total += inv.amountDue;
      buckets[bucket].invoices.push(inv);
    }

    const grandTotal = invoices.reduce((s, i) => s + i.amountDue, BigInt(0));

    return { buckets, grandTotal, count: invoices.length };
  }),

  // =========================================================================
  // AP AGING — Outstanding PO balances by age bucket
  // =========================================================================
  apAging: protectedProcedure.input(dateRangeSchema).query(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const pos = await ctx.prisma.purchaseOrder.findMany({
      where: {
        organizationId: orgId,
        status: { in: ['ORDERED', 'PARTIAL_RECEIVED', 'RECEIVED'] },
        amountOwed: { gt: BigInt(0) },
        ...(input.from || input.to
          ? {
              orderDate: {
                ...(input.from && { gte: input.from }),
                ...(input.to && { lte: input.to }),
              },
            }
          : {}),
      },
      select: {
        id: true,
        serial: true,
        orderDate: true,
        expectedDate: true,
        total: true,
        amountOwed: true,
        supplier: { select: { id: true, name: true } },
      },
    });

    const buckets: Record<AgeBucket, { count: number; total: bigint; pos: typeof pos }> = {
      '0-30': { count: 0, total: BigInt(0), pos: [] },
      '31-60': { count: 0, total: BigInt(0), pos: [] },
      '61-90': { count: 0, total: BigInt(0), pos: [] },
      '90+': { count: 0, total: BigInt(0), pos: [] },
    };

    for (const po of pos) {
      const bucket = ageBucket(po.orderDate);
      buckets[bucket].count++;
      buckets[bucket].total += po.amountOwed;
      buckets[bucket].pos.push(po);
    }

    const grandTotal = pos.reduce((s, p) => s + p.amountOwed, BigInt(0));

    return { buckets, grandTotal, count: pos.length };
  }),

  // =========================================================================
  // REVENUE — Invoiced revenue by period
  // =========================================================================
  revenue: protectedProcedure
    .input(
      dateRangeSchema.extend({
        period: periodSchema,
        customerId: z.string().optional(),
        categoryId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const where: any = {
        organizationId: orgId,
        type: 'INVOICE',
        status: { in: ['SENT', 'PARTIAL', 'PAID'] },
        ...(input.customerId && { customerId: input.customerId }),
        ...(input.from || input.to
          ? { date: { ...(input.from && { gte: input.from }), ...(input.to && { lte: input.to }) } }
          : {}),
      };

      const invoices = await ctx.prisma.invoice.findMany({
        where,
        select: {
          date: true,
          subtotal: true,
          discountTotal: true,
          taxTotal: true,
          total: true,
          customer: { select: { id: true, name: true } },
        },
        orderBy: { date: 'asc' },
      });

      // Group by period
      const periodMap = new Map<string, { label: string; revenue: bigint; count: number }>();

      for (const inv of invoices) {
        const d = inv.date;
        let key: string;
        let label: string;

        if (input.period === 'month') {
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        } else if (input.period === 'quarter') {
          const q = Math.floor(d.getMonth() / 3) + 1;
          key = `${d.getFullYear()}-Q${q}`;
          label = `Q${q} ${d.getFullYear()}`;
        } else {
          key = `${d.getFullYear()}`;
          label = String(d.getFullYear());
        }

        const existing = periodMap.get(key) ?? { label, revenue: BigInt(0), count: 0 };
        existing.revenue += inv.total;
        existing.count++;
        periodMap.set(key, existing);
      }

      const periods = Array.from(periodMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => ({ key, ...v }));

      const totalRevenue = invoices.reduce((s, i) => s + i.total, BigInt(0));

      return { periods, totalRevenue, invoiceCount: invoices.length };
    }),

  // =========================================================================
  // COGS — Cost of goods sold (purchasePrice snapshot × quantity per line)
  // =========================================================================
  cogs: protectedProcedure.input(dateRangeSchema).query(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const lines = await ctx.prisma.invoiceLine.findMany({
      where: {
        organizationId: orgId,
        invoice: {
          type: 'INVOICE',
          status: { in: ['SENT', 'PARTIAL', 'PAID'] },
          ...(input.from || input.to
            ? {
                date: {
                  ...(input.from && { gte: input.from }),
                  ...(input.to && { lte: input.to }),
                },
              }
            : {}),
        },
        item: { type: 'PRODUCT' },
      },
      select: {
        quantity: true,
        purchasePrice: true,
        item: { select: { id: true, name: true, category: { select: { id: true, name: true } } } },
      },
    });

    let totalCogs = BigInt(0);
    const byCategory = new Map<string, { name: string; cogs: bigint }>();

    for (const line of lines) {
      const qty = parseFloat(String(line.quantity));
      const cost = (BigInt(line.purchasePrice) * BigInt(Math.round(qty * 1000))) / BigInt(1000);
      totalCogs += cost;

      const catId = line.item?.category?.id ?? 'uncategorised';
      const catName = line.item?.category?.name ?? 'Uncategorised';
      const existing = byCategory.get(catId) ?? { name: catName, cogs: BigInt(0) };
      existing.cogs += cost;
      byCategory.set(catId, existing);
    }

    return {
      totalCogs,
      byCategory: Array.from(byCategory.entries()).map(([id, v]) => ({ id, ...v })),
    };
  }),

  // =========================================================================
  // GROSS PROFIT — Revenue − COGS, by period
  // =========================================================================
  grossProfit: protectedProcedure
    .input(dateRangeSchema.extend({ period: periodSchema }))
    .query(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      // Fetch confirmed invoices with their lines (for COGS)
      const invoices = await ctx.prisma.invoice.findMany({
        where: {
          organizationId: orgId,
          type: 'INVOICE',
          status: { in: ['SENT', 'PARTIAL', 'PAID'] },
          ...(input.from || input.to
            ? {
                date: {
                  ...(input.from && { gte: input.from }),
                  ...(input.to && { lte: input.to }),
                },
              }
            : {}),
        },
        select: {
          date: true,
          total: true,
          lines: {
            where: { item: { type: 'PRODUCT' } },
            select: { quantity: true, purchasePrice: true },
          },
        },
        orderBy: { date: 'asc' },
      });

      const periodMap = new Map<
        string,
        { label: string; revenue: bigint; cogs: bigint; grossProfit: bigint }
      >();

      for (const inv of invoices) {
        const d = inv.date;
        let key: string;
        let label: string;

        if (input.period === 'month') {
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        } else if (input.period === 'quarter') {
          const q = Math.floor(d.getMonth() / 3) + 1;
          key = `${d.getFullYear()}-Q${q}`;
          label = `Q${q} ${d.getFullYear()}`;
        } else {
          key = `${d.getFullYear()}`;
          label = String(d.getFullYear());
        }

        const lineCogs = inv.lines.reduce((s, l) => {
          const qty = parseFloat(String(l.quantity));
          return s + (BigInt(l.purchasePrice) * BigInt(Math.round(qty * 1000))) / BigInt(1000);
        }, BigInt(0));

        const existing = periodMap.get(key) ?? {
          label,
          revenue: BigInt(0),
          cogs: BigInt(0),
          grossProfit: BigInt(0),
        };
        existing.revenue += inv.total;
        existing.cogs += lineCogs;
        existing.grossProfit = existing.revenue - existing.cogs;
        periodMap.set(key, existing);
      }

      const periods = Array.from(periodMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => ({ key, ...v }));

      const totalRevenue = periods.reduce((s, p) => s + p.revenue, BigInt(0));
      const totalCogs = periods.reduce((s, p) => s + p.cogs, BigInt(0));

      return {
        periods,
        totalRevenue,
        totalCogs,
        totalGrossProfit: totalRevenue - totalCogs,
      };
    }),

  // =========================================================================
  // CASH FLOW — Payments received by date and method
  // =========================================================================
  cashFlow: protectedProcedure
    .input(dateRangeSchema.extend({ period: periodSchema }))
    .query(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const payments = await ctx.prisma.payment.findMany({
        where: {
          organizationId: orgId,
          ...(input.from || input.to
            ? {
                date: {
                  ...(input.from && { gte: input.from }),
                  ...(input.to && { lte: input.to }),
                },
              }
            : {}),
        },
        select: { date: true, amount: true, method: true },
        orderBy: { date: 'asc' },
      });

      const periodMap = new Map<
        string,
        {
          label: string;
          total: bigint;
          byMethod: Record<string, bigint>;
        }
      >();

      const methods = new Set<string>();

      for (const p of payments) {
        const d = p.date;
        let key: string;
        let label: string;

        if (input.period === 'month') {
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        } else if (input.period === 'quarter') {
          const q = Math.floor(d.getMonth() / 3) + 1;
          key = `${d.getFullYear()}-Q${q}`;
          label = `Q${q} ${d.getFullYear()}`;
        } else {
          key = `${d.getFullYear()}`;
          label = String(d.getFullYear());
        }

        methods.add(p.method);
        const existing = periodMap.get(key) ?? { label, total: BigInt(0), byMethod: {} };
        existing.total += p.amount;
        existing.byMethod[p.method] = (existing.byMethod[p.method] ?? BigInt(0)) + p.amount;
        periodMap.set(key, existing);
      }

      const periods = Array.from(periodMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => ({ key, ...v }));

      const totalCash = payments.reduce((s, p) => s + p.amount, BigInt(0));

      return {
        periods,
        totalCash,
        methods: Array.from(methods),
      };
    }),

  // =========================================================================
  // LOW STOCK REPORT — Items below minimum stock level per warehouse
  // =========================================================================
  lowStock: protectedProcedure
    .input(z.object({ warehouseId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const stockRows = await ctx.prisma.stock.findMany({
        where: {
          organizationId: orgId,
          item: { deletedAt: null, type: 'PRODUCT' },
          ...(input.warehouseId && { warehouseId: input.warehouseId }),
        },
        include: {
          item: { select: { id: true, name: true, sku: true, minStock: true, unit: true } },
          warehouse: { select: { id: true, name: true } },
        },
      });

      return stockRows
        .filter((s) => s.quantity < s.item.minStock)
        .map((s) => ({
          itemId: s.item.id,
          itemName: s.item.name,
          sku: s.item.sku,
          unit: s.item.unit,
          warehouseId: s.warehouse.id,
          warehouseName: s.warehouse.name,
          quantity: s.quantity,
          minStock: s.item.minStock,
          shortfall: s.item.minStock - s.quantity,
        }))
        .sort((a, b) => b.shortfall - a.shortfall);
    }),
});
