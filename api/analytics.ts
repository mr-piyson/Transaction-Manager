// server/routers/analytics.ts  (or wherever your router lives)
import { z } from 'zod';
import { authed, router } from '@/trpc/server';
import { eachDayOfInterval, startOfDay, subDays, format } from 'date-fns';
import { getCurrentUser } from '@/lib/auth';

export const analyticsRouter = router({
  invoiceAreaChart: authed
    .input(z.object({ range: z.enum(['7d', '30d', '90d']) }))
    .query(async ({ ctx, input }) => {
      // 1. Always read organizationId from session — never trust the client
      const organizationId = (await getCurrentUser())?.organizationId;

      // 2. Compute date range
      const days = input.range === '7d' ? 7 : input.range === '30d' ? 30 : 90;
      const now = new Date();
      const rangeStart = startOfDay(subDays(now, days - 1));

      // 3. Fetch completed invoices in range, with top-level lines + their children
      const invoices = await ctx.db.invoice.findMany({
        where: {
          organizationId,
          isCompleted: true,
          date: { gte: rangeStart },
        },
        select: {
          date: true,
          invoiceLines: {
            where: { parentId: null }, // only top-level lines
            select: {
              isGroup: true,
              purchasePrice: true,
              salesPrice: true,
              quantity: true,
              childLines: {
                select: {
                  purchasePrice: true,
                  salesPrice: true,
                  quantity: true,
                },
              },
            },
          },
        },
      });

      // 4. Aggregate into a Map keyed by "yyyy-MM-dd"
      const byDay = new Map<string, { expense: number; income: number }>();

      for (const invoice of invoices) {
        const key = format(invoice.date ?? new Date(), 'yyyy-MM-dd');
        if (!byDay.has(key)) byDay.set(key, { expense: 0, income: 0 });
        const day = byDay.get(key)!;

        for (const line of invoice.invoiceLines) {
          // 4a. Resolve the lines to actually accumulate
          const effectiveLines =
            line.isGroup && line.childLines.length > 0
              ? line.childLines // group header → use children
              : line.isGroup // empty group → skip
                ? []
                : [line]; // normal line → use itself

          for (const l of effectiveLines) {
            // 5. Monetary calculations (still in fils)
            day.expense += l.purchasePrice * l.quantity;
            day.income += Math.max(0, (l.salesPrice - l.purchasePrice) * l.quantity);
          }
        }
      }

      // 6. Zero-fill every day in the interval
      const chartData = eachDayOfInterval({ start: rangeStart, end: now }).map((d) => {
        const key = format(d, 'yyyy-MM-dd');
        const { expense, income } = byDay.get(key) ?? { expense: 0, income: 0 };
        return { date: key, income, expense };
      });

      return { chartData };
    }),

  // ── 1. Payment method breakdown (pie / donut) ─────────────────────────
  paymentMethodChart: authed
    .input(z.object({ range: z.enum(['7d', '30d', '90d']) }))
    .query(async ({ ctx, input }) => {
      const organizationId = (await getCurrentUser())?.organizationId;
      const days = input.range === '7d' ? 7 : input.range === '30d' ? 30 : 90;
      const since = startOfDay(subDays(new Date(), days - 1));

      const payments = await ctx.db.payment.findMany({
        where: { invoice: { organizationId, isCompleted: true }, date: { gte: since } },
        select: { method: true, amount: true },
      });

      const totals: Record<string, number> = {};
      for (const p of payments) {
        totals[p.method] = (totals[p.method] ?? 0) + p.amount;
      }
      return Object.entries(totals).map(([method, amount]) => ({ method, amount }));
    }),

  // ── 2. Top customers by total revenue ─────────────────────────────────
  topCustomersChart: authed
    .input(
      z.object({
        range: z.enum(['7d', '30d', '90d']),
        limit: z.number().min(1).max(20).default(8),
      }),
    )
    .query(async ({ ctx, input }) => {
      const organizationId = (await getCurrentUser())?.organizationId;
      const days = input.range === '7d' ? 7 : input.range === '30d' ? 30 : 90;
      const since = startOfDay(subDays(new Date(), days - 1));

      const invoices = await ctx.db.invoice.findMany({
        where: {
          organizationId,
          isCompleted: true,
          date: { gte: since },
          customerId: { not: null },
        },
        select: { total: true, customer: { select: { id: true, name: true } } },
      });

      const map = new Map<number, { name: string; revenue: number }>();
      for (const inv of invoices) {
        if (!inv.customer) continue;
        const entry = map.get(inv.customer.id) ?? { name: inv.customer.name, revenue: 0 };
        entry.revenue += inv.total;
        map.set(inv.customer.id, entry);
      }

      return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, input.limit);
    }),

  // ── 3. Inventory margin analysis (top items by volume) ────────────────
  inventoryMarginChart: authed
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      const organizationId = (await getCurrentUser())?.organizationId;

      const lines = await ctx.db.invoiceLine.findMany({
        where: {
          invoice: { organizationId, isCompleted: true },
          parentId: null,
          isGroup: false,
          inventoryItemId: { not: null },
        },
        select: {
          purchasePrice: true,
          salesPrice: true,
          quantity: true,
          itemRef: { select: { id: true, name: true } },
        },
      });

      const map = new Map<number, { name: string; cost: number; revenue: number; qty: number }>();
      for (const l of lines) {
        if (!l.itemRef) continue;
        const e = map.get(l.itemRef.id) ?? { name: l.itemRef.name, cost: 0, revenue: 0, qty: 0 };
        e.cost += l.purchasePrice * l.quantity;
        e.revenue += l.salesPrice * l.quantity;
        e.qty += l.quantity;
        map.set(l.itemRef.id, e);
      }

      return [...map.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, input.limit)
        .map(({ name, cost, revenue }) => ({
          name,
          cost,
          revenue,
          margin: revenue - cost,
          marginPct: revenue > 0 ? Math.round(((revenue - cost) / revenue) * 100) : 0,
        }));
    }),

  // ── 4. Contract pipeline ───────────────────────────────────────────────
  contractPipelineChart: authed.query(async ({ ctx }) => {
    const organizationId = (await getCurrentUser())?.organizationId;
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400_000);
    const in90 = new Date(now.getTime() + 90 * 86400_000);

    const contracts = await ctx.db.contract.findMany({
      where: { organizationId },
      select: { active: true, endDate: true, contractValue: true },
    });

    let expiringSoon = 0,
      expiringLater = 0,
      expired = 0,
      inactive = 0;
    let valueActive = 0;
    for (const c of contracts) {
      if (!c.active) {
        inactive++;
        continue;
      }
      if (c.endDate < now) {
        expired++;
        continue;
      }
      if (c.endDate <= in30) {
        expiringSoon++;
        valueActive += c.contractValue ?? 0;
        continue;
      }
      if (c.endDate <= in90) {
        expiringLater++;
        valueActive += c.contractValue ?? 0;
        continue;
      }
      valueActive += c.contractValue ?? 0;
    }

    return {
      segments: [
        {
          label: 'Active',
          count:
            contracts.filter((c) => c.active && c.endDate >= now).length -
            expiringSoon -
            expiringLater,
        },
        { label: 'Expiring (30d)', count: expiringSoon },
        { label: 'Expiring (90d)', count: expiringLater },
        { label: 'Expired', count: expired },
        { label: 'Inactive', count: inactive },
      ],
      totalActiveValue: valueActive,
    };
  }),

  // ── 5. Invoice completion rate by day ─────────────────────────────────
  invoiceCompletionRateChart: authed
    .input(z.object({ range: z.enum(['7d', '30d', '90d']) }))
    .query(async ({ ctx, input }) => {
      const { eachDayOfInterval } = await import('date-fns');
      const organizationId = (await getCurrentUser())?.organizationId;
      const days = input.range === '7d' ? 7 : input.range === '30d' ? 30 : 90;
      const since = startOfDay(subDays(new Date(), days - 1));

      const invoices = await ctx.db.invoice.findMany({
        where: { organizationId, date: { gte: since } },
        select: { date: true, isCompleted: true },
      });

      const byDay = new Map<string, { total: number; completed: number }>();
      for (const inv of invoices) {
        const key = format(inv.date ?? new Date(), 'yyyy-MM-dd');
        const d = byDay.get(key) ?? { total: 0, completed: 0 };
        d.total++;
        if (inv.isCompleted) d.completed++;
        byDay.set(key, d);
      }

      return eachDayOfInterval({ start: since, end: new Date() }).map((d) => {
        const key = format(d, 'yyyy-MM-dd');
        const { total, completed } = byDay.get(key) ?? { total: 0, completed: 0 };
        return {
          date: key,
          total,
          completed,
          rate: total > 0 ? Math.round((completed / total) * 100) : null,
        };
      });
    }),
});
