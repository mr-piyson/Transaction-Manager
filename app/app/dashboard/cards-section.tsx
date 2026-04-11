import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { trpc } from '@/lib/trpc/client';
import { Format } from '@/lib/format';
import { TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import { formatAmount } from '@/lib/utils';

const KpiCard = ({ title, value, icon, description, trend }: any) => (
  <Card className="drop-shadow-sm flex flex-col relative overflow-hidden h-full">
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

export function CardsSection() {
  const {
    data: invoices,
    isLoading: invoicesLoading,
    isError: invoicesError,
  } = trpc.invoices.getInvoices.useQuery({
    payments: true,
    customer: true,
  });

  const { data: customers, isLoading: customersLoading } = trpc.customers.getCustomers.useQuery();

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

  const kpis = [
    {
      title: 'Total Revenue',
      value: formatAmount(stats.revenue),
      icon: <Wallet className="w-4 h-4" />,
      description: 'Lifetime billed revenue',
      trend: 'up',
    },
    {
      title: 'Collected Revenue',
      value: formatAmount(stats.paid),
      icon: <TrendingUp className="w-4 h-4" />,
      description: 'Total actual received',
      trend: 'up',
    },
    {
      title: 'Outstanding Balance',
      value: formatAmount(stats.outstanding),
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
    <Carousel className="max-sm:w-full">
      <CarouselContent className="px-2 py-1">
        {kpis.map((kpi, idx) => (
          <CarouselItem
            key={idx}
            className="basis-[25%] max-[1150px]:basis-[45%] max-sm:basis-[80%]"
          >
            <KpiCard {...kpi} />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
