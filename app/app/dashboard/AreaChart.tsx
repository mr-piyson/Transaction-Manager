'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

import { Skeleton } from '@/components/ui/skeleton';
import { Format } from '@/lib/format';

const chartConfig = {
  income: {
    label: 'Income (Margin)',
    color: 'var(--chart-2)', // green-ish
  },
  expense: {
    label: 'Expense (Cost)',
    color: 'var(--chart-1)', // red-ish
  },
} satisfies ChartConfig;

function formatBHD(value: number) {
  return Format.money.db(value);
}

// const rangeLabel = {
//   '90d': 'Last 3 months',
//   '30d': 'Last 30 days',
//   '7d': 'Last 7 days',
// };

// ── Types ──────────────────────────────────────────────────────────────────
type Range = '7d' | '30d' | '90d';

export function ChartAreaInteractive() {
  const [timeRange, setTimeRange] = React.useState<Range>('90d');

  const { data, isLoading, isError } = trpc.analytics.invoiceAreaChart.useQuery(
    { range: timeRange },
    { staleTime: 1000 * 60 * 5 },
  );

  return (
    <Card className="pt-0 w-full">
      <CardHeader className="flex flex-col md:flex-row max-sm:items-start! items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Income vs Expenses</CardTitle>
          <CardDescription>Income = margin per line · Expense = purchase cost</CardDescription>
        </div>

        {/* Range selector */}
        <div className="flex gap-1 rounded-md border p-1 text-sm">
          {(['7d', '30d', '90d'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={[
                'rounded px-3 py-1 transition-colors',
                timeRange === r
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted',
              ].join(' ')}
            >
              {r === '7d' ? '7 days' : r === '30d' ? '30 days' : '90 days'}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading && <Skeleton className="h-[250px] w-full rounded-xl" />}

        {isError && (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Failed to load chart data.
          </div>
        )}

        {data && (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <AreaChart data={data.chartData} margin={{ left: 0, right: 0 }}>
              <defs>
                <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} />

              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={timeRange === '7d' ? 0 : 32}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                }
              />

              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    }
                    formatter={(value) => formatBHD(value as number)}
                    indicator="dot"
                  />
                }
              />

              {/* Expense behind income — rendered first = bottom layer */}
              <Area
                dataKey="expense"
                type="monotone"
                fill="url(#fillExpense)"
                stroke="var(--color-expense)"
                stackId="a"
              />
              <Area
                dataKey="income"
                type="monotone"
                fill="url(#fillIncome)"
                stroke="var(--color-income)"
                stackId="a"
              />

              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
