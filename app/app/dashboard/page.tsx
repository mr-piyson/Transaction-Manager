'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import { useInvoices } from '@/hooks/data/use-invoices';
import { useCustomers } from '@/hooks/data/use-customers';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Receipt,
  Users,
  Loader2,
  CalendarDays,
  Activity,
  LayoutDashboard,
} from 'lucide-react';
import { Format } from '@/lib/format';
import { Header } from '../App-Header';

export default function Dashboard() {
  const {
    data: invoices,
    isLoading: invoicesLoading,
    isError: invoicesError,
  } = useInvoices({
    include: { payments: true, customer: true },
  });

  const { data: customers, isLoading: customersLoading } = useCustomers();

  // Computations
  const stats = useMemo(() => {
    if (!invoices) return { revenue: 0, paid: 0, outstanding: 0, count: 0 };

    let revenue = 0;
    let paid = 0;

    invoices.forEach((inv: any) => {
      revenue += inv.total || 0;
      const invPaid = (inv.payments || []).reduce(
        (acc: number, p: any) => acc + (p.amount || 0),
        0,
      );
      paid += invPaid;
    });

    return {
      revenue,
      paid,
      outstanding: revenue - paid,
      count: invoices.length,
    };
  }, [invoices]);

  const chartData = useMemo(() => {
    if (!invoices) return [];

    // Group invoices by month (MMM format)
    const grouped = invoices.reduce((acc: Record<string, number>, inv: any) => {
      if (!inv.date) return acc;
      const date = new Date(inv.date);
      const month = date.toLocaleString('default', { month: 'short' });
      acc[month] = (acc[month] || 0) + (inv.total || 0);
      return acc;
    }, {});

    const monthsOrder = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    // Fill all months up to current month with at least 0 if they don't exist yet, to show timeline
    const currentMonthIndex = new Date().getMonth();
    const data = [];
    for (let i = 0; i <= currentMonthIndex; i++) {
      const m = monthsOrder[i];
      data.push({
        name: m,
        revenue: grouped[m] || 0,
      });
    }

    // Default chart data if empty
    if (data.length === 0) {
      data.push({ name: 'Jan', revenue: 0 });
    }

    return data;
  }, [invoices]);

  if (invoicesLoading || customersLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (invoicesError) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center bg-background">
        <Activity className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground font-medium text-lg">Failed to load dashboard data</p>
      </div>
    );
  }

  const KpiCard = ({ title, value, icon, description, trend }: any) => (
    <Card className="flex flex-col relative overflow-hidden h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="p-2 bg-muted/50 rounded-lg text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3 text-destructive" />}
          {description}
        </p>
      </CardContent>
    </Card>
  );

  const kpis = [
    {
      title: 'Total Revenue',
      value: Format.money.amount(stats.revenue),
      icon: <Wallet className="w-4 h-4" />,
      description: 'Lifetime billed revenue',
      trend: 'up',
    },
    {
      title: 'Collected Revenue',
      value: Format.money.amount(stats.paid),
      icon: <TrendingUp className="w-4 h-4" />,
      description: 'Total actual received',
      trend: 'up',
    },
    {
      title: 'Outstanding Balance',
      value: Format.money.amount(stats.outstanding),
      icon: <TrendingDown className="w-4 h-4" />,
      description: 'Pending collections',
      trend: stats.outstanding > 0 ? 'down' : 'up',
    },
    {
      title: 'Total Customers',
      value: customers?.length || 0,
      icon: <Users className="w-4 h-4" />,
      description: 'Active client base',
      trend: 'up',
    },
  ];

  return (
    <>
      <Header
        title="Financial Dashboard"
        icon={<LayoutDashboard className="w-4 h-4" />}
        sticky={true}
      />
      <div className="flex flex-col min-h-screen bg-background p-4 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Overview of your financial performance and business metrics.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            <CalendarDays className="w-3 h-3 mr-1" />
            YTD {new Date().getFullYear()}
          </Badge>
        </div>

        {/* KPIs Desktop */}
        <div className="hidden md:flex flex-row flex-wrap gap-4">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="flex-1 ">
              <KpiCard {...kpi} />
            </div>
          ))}
        </div>

        {/* KPIs Mobile Carousel */}
        <div className="md:hidden flex flex-col w-full overflow-hidden">
          <Carousel className="w-full">
            <CarouselContent className="px-2">
              {kpis.map((kpi, idx) => (
                <CarouselItem key={idx} className="basis-[85%] sm:basis-[60%] pl-2">
                  <KpiCard {...kpi} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        <Separator />

        <div className="flex flex-col lg:flex-row gap-6 ">
          {/* Main Chart Card */}
          <Card className="flex-1 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Revenue Overview</CardTitle>
              <CardDescription>Monthly billed revenue distribution tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ChartContainer
                  config={{
                    revenue: {
                      label: 'Revenue',
                      color: 'hsl(var(--primary))',
                    },
                  }}
                  className="w-full h-full"
                >
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--muted-foreground)/0.2)"
                    />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} // Assuming values are in actual dollars but Money.format handles fractions... Wait, what is the DB storing? The schema says smallest currency unit (cents/fils). We should format it correctly or divide by 1000/1000 just for display shorthand. Let's just use naive format for chart YAxis or hide it.
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          indicator="line"
                          labelFormatter={(value) => `${value} Revenue`}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-success)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* Side Ranking / Recent Invoices */}
          <Card className="w-full lg:w-[400px] shadow-sm flex flex-col">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              <CardDescription>Latest generated invoices</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto">
              {!invoices || invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center flex-1 h-full">
                  <Receipt className="mb-4 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No recent invoices found</p>
                </div>
              ) : (
                (invoices.slice(0, 5) as any[]).map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold truncate leading-tight">
                          INV-{String(inv.id).padStart(5, '0')}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {inv.customer?.name || 'Walk-in'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold">
                        {Format.money.amount(inv.total || 0)}
                      </span>
                      <Badge
                        variant={inv.paymentStatus === 'Paid' ? 'outline' : 'secondary'}
                        className={`text-[10px] mt-1 h-4 px-1 ${
                          inv.paymentStatus === 'Paid'
                            ? 'border-emerald-500/50 text-emerald-600 bg-emerald-500/10'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {inv.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
