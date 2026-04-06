// components/charts/AnalyticsDashboard.tsx
'use client';

import * as React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  Legend as RechartsLegend,
} from 'recharts';
import { trpc } from '@/trpc/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { Format } from '@/lib/format';

// ── Helpers ────────────────────────────────────────────────────────────────
type Range = '7d' | '30d' | '90d';
const bhd = (fils: number) => Format.money.amount(fils);
const bhdShort = (fils: number) =>
  fils >= 1_000_000
    ? `${(fils / 1_000_000).toFixed(1)}K BD`
    : fils >= 1000
      ? `${(fils / 1000).toFixed(2)} BD`
      : `${fils} f`;

// ── Palette (recharts doesn't read CSS vars, so hardcode for both themes)
const COLORS = {
  cash: '#1D9E75',
  transfer: '#7F77DD',
  cost: '#D85A30',
  margin: '#1D9E75',
  active: '#1D9E75',
  soon: '#BA7517',
  later: '#EF9F27',
  expired: '#E24B4A',
  inactive: '#888780',
  rate: '#378ADD',
  total: '#B4B2A9',
};

const METHOD_COLORS: Record<string, string> = {
  CASH: COLORS.cash,
  TRANSFER: COLORS.transfer,
};

const CONTRACT_COLORS: Record<string, string> = {
  Active: COLORS.active,
  'Expiring (30d)': COLORS.soon,
  'Expiring (90d)': COLORS.later,
  Expired: COLORS.expired,
  Inactive: COLORS.inactive,
};

// ── Reusable Skeleton Card ─────────────────────────────────────────────────
function ChartSkeleton({ title, height = 220 }: { title: string; height?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton style={{ height }} className="w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

// ── Range Toggle ───────────────────────────────────────────────────────────
function RangeToggle({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex gap-1 rounded-md border p-0.5 text-xs">
      {(['7d', '30d', '90d'] as Range[]).map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={[
            'rounded px-2.5 py-1 transition-colors',
            value === r
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:bg-muted',
          ].join(' ')}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// ── Chart 1: Payment Methods (Donut) ──────────────────────────────────────
export function PaymentMethodChart() {
  const [range, setRange] = React.useState<Range>('30d');
  const { data, isLoading, isError } = trpc.analytics.paymentMethodChart.useQuery({ range });

  if (isLoading) return <ChartSkeleton title="Payment methods" />;
  if (isError || !data?.length)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment methods</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[220px] items-center justify-center text-muted-foreground text-sm">
          {isError ? 'Failed to load' : 'No data for this period'}
        </CardContent>
      </Card>
    );

  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle>Payment methods</CardTitle>
          <CardDescription>Collected by method — {bhd(total)} total</CardDescription>
        </div>
        <RangeToggle value={range} onChange={setRange} />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={200}>
            <PieChart>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="method"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {data.map((entry) => (
                  <Cell key={entry.method} fill={METHOD_COLORS[entry.method] ?? '#888'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => [bhd(v), '']}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '0.5px solid var(--border)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-3 text-sm">
            {data.map((entry) => {
              const pct = total > 0 ? Math.round((entry.amount / total) * 100) : 0;
              return (
                <div key={entry.method} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: METHOD_COLORS[entry.method] ?? '#888' }}
                    />
                    <span className="font-medium">{entry.method}</span>
                    <span className="ml-auto text-muted-foreground">{pct}%</span>
                  </div>
                  <span className="pl-4 text-xs text-muted-foreground font-mono">
                    {bhd(entry.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart 2: Top Customers (Horizontal Bar) ───────────────────────────────
export function TopCustomersChart() {
  const [range, setRange] = React.useState<Range>('30d');
  const { data, isLoading, isError } = trpc.analytics.topCustomersChart.useQuery({
    range,
    limit: 8,
  });

  if (isLoading) return <ChartSkeleton title="Top customers" height={280} />;
  if (isError || !data?.length)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top customers</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
          {isError ? 'Failed to load' : 'No data for this period'}
        </CardContent>
      </Card>
    );

  // Truncate long names for the axis
  const chartData = [...data]
    .reverse()
    .map((d) => ({ ...d, shortName: d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle>Top customers</CardTitle>
          <CardDescription>By completed invoice revenue</CardDescription>
        </div>
        <RangeToggle value={range} onChange={setRange} />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 8, right: 40, top: 4, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={bhdShort}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="shortName"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={110}
            />
            <Tooltip
              formatter={(v: number) => [bhd(v), 'Revenue']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid var(--border)' }}
            />
            <Bar dataKey="revenue" radius={[0, 4, 4, 0]} fill={COLORS.active} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Chart 3: Inventory Margin (Grouped Bar) ───────────────────────────────
export function InventoryMarginChart() {
  const { data, isLoading, isError } = trpc.analytics.inventoryMarginChart.useQuery({ limit: 8 });

  if (isLoading) return <ChartSkeleton title="Item margins" height={260} />;
  if (isError || !data?.length)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Item margins</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[260px] items-center justify-center text-muted-foreground text-sm">
          {isError ? 'Failed to load' : 'No completed invoice lines found'}
        </CardContent>
      </Card>
    );

  const chartData = data.map((d) => ({
    ...d,
    shortName: d.name.length > 14 ? d.name.slice(0, 12) + '…' : d.name,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Item margins</CardTitle>
        <CardDescription>Cost vs revenue per inventory item (all time)</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="mb-3 flex gap-4 text-xs text-muted-foreground">
          {(['cost', 'margin'] as const).map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[k] }} />
              {k === 'cost' ? 'Cost' : 'Margin'}
            </span>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ left: 4, right: 4, top: 4, bottom: 20 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="shortName"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tickFormatter={bhdShort}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              formatter={(v: number, name: string) => [bhd(v), name === 'cost' ? 'Cost' : 'Margin']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid var(--border)' }}
            />
            <Bar
              dataKey="cost"
              stackId="a"
              fill={COLORS.cost}
              radius={[0, 0, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="margin"
              stackId="a"
              fill={COLORS.margin}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Chart 4: Contract Pipeline (Donut + stat) ─────────────────────────────
export function ContractPipelineChart() {
  const { data, isLoading, isError } = trpc.analytics.contractPipelineChart.useQuery();

  if (isLoading) return <ChartSkeleton title="Contract pipeline" />;
  if (isError)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contract pipeline</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[220px] items-center justify-center text-muted-foreground text-sm">
          Failed to load
        </CardContent>
      </Card>
    );

  const segments = (data?.segments ?? []).filter((s) => s.count > 0);
  const total = segments.reduce((s, d) => s + d.count, 0);

  return (
    <Card className="flex-1">
      <CardHeader className="pb-2">
        <CardTitle>Contract pipeline</CardTitle>
        <CardDescription>
          {total} contracts · {bhd(data?.totalActiveValue ?? 0)} active value
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={200}>
            <PieChart>
              <Pie
                data={segments}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={82}
                paddingAngle={2}
              >
                {segments.map((s) => (
                  <Cell key={s.label} fill={CONTRACT_COLORS[s.label] ?? '#888'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, name: string) => [`${v} contracts`, name]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '0.5px solid var(--border)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 text-sm">
            {segments.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: CONTRACT_COLORS[s.label] ?? '#888' }}
                />
                <span className="text-muted-foreground">{s.label}</span>
                <span className="ml-auto font-medium tabular-nums">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart 5: Invoice Completion Rate (Line) ───────────────────────────────
export function InvoiceCompletionRateChart() {
  const [range, setRange] = React.useState<Range>('30d');
  const { data, isLoading, isError } = trpc.analytics.invoiceCompletionRateChart.useQuery({
    range,
  });

  if (isLoading) return <ChartSkeleton title="Completion rate" height={200} />;
  if (isError)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Completion rate</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
          Failed to load
        </CardContent>
      </Card>
    );

  const tickEvery = range === '7d' ? 1 : range === '30d' ? 5 : 15;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle>Invoice completion rate</CardTitle>
          <CardDescription>% of invoices marked as completed per day</CardDescription>
        </div>
        <RangeToggle value={range} onChange={setRange} />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ left: 4, right: 4, top: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(v, i) => (i % tickEvery === 0 ? format(parseISO(v), 'MMM d') : '')}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={38}
            />
            <Tooltip
              formatter={(v: number | null) =>
                v == null ? ['—', 'Rate'] : [`${v}%`, 'Completion rate']
              }
              labelFormatter={(l) => format(parseISO(l as string), 'MMM d, yyyy')}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid var(--border)' }}
            />
            {/* Total invoices as faint bars in the background */}
            <BarChart data={data}>
              <Bar dataKey="total" fill={COLORS.total} opacity={0.25} maxBarSize={8} />
            </BarChart>
            <Line
              type="monotone"
              dataKey="rate"
              stroke={COLORS.rate}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-muted-foreground">Null gaps = days with no invoices</p>
      </CardContent>
    </Card>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export function AnalyticsDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PaymentMethodChart />
      <ContractPipelineChart />
      <TopCustomersChart />
      <InventoryMarginChart />
      <div className="md:col-span-2">
        <InvoiceCompletionRateChart />
      </div>
    </div>
  );
}
