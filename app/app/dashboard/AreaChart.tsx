'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { trpc } from '@/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const chartConfig = {
  income: {
    label: 'Income (Margin)',
    color: 'var(--chart-1)', // green-ish
  },
  expense: {
    label: 'Expense (Cost)',
    color: 'var(--chart-2)', // red-ish
  },
} satisfies ChartConfig;

function formatBHD(value: number) {
  return (value / 1000).toLocaleString('en-BH', {
    style: 'currency',
    currency: 'BHD',
    minimumFractionDigits: 3,
  });
}

const rangeLabel = {
  '90d': 'Last 3 months',
  '30d': 'Last 30 days',
  '7d': 'Last 7 days',
};

export function ChartAreaInteractive() {
  const [timeRange, setTimeRange] = React.useState<'7d' | '30d' | '90d'>('90d');

  const { data, isLoading, isError } = trpc.analytics.invoiceAreaChart.useQuery(
    { range: timeRange },
    { staleTime: 1000 * 60 * 5 },
  );

  return (
    <Card className="pt-0 w-full">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Income vs Expenses</CardTitle>
          <CardDescription>
            Income = margin per line · Expense = purchase cost · {rangeLabel[timeRange]}
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
          <SelectTrigger className="w-[160px] rounded-lg sm:ml-auto" aria-label="Select time range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select>
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
