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
});
