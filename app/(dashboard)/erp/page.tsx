'use client';

import {
  ArrowRight,
  BarChart3,
  Box,
  ClipboardList,
  FileDown,
  IndianRupee,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';
import { Header } from '@/components/layout/App-Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCurrency } from '@/hooks/use-currency';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { useDateFormat } from '@/hooks/use-date-format';

function StatCard({
  title,
  value,
  sub,
  icon,
  trend,
  href,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  trend?: { dir: 'up' | 'down'; label: string };
  href?: string;
}) {
  const inner = (
    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group cursor-pointer">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary transition-colors group-hover:bg-primary/20">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 mt-2 text-xs font-medium',
              trend.dir === 'up' ? 'text-emerald-600' : 'text-red-600',
            )}
          >
            <TrendingUp className={cn('size-3', trend.dir === 'down' && 'rotate-180')} />
            {trend.label}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

function WorkflowStep({
  step,
  title,
  description,
  icon,
  action,
  actionLabel,
  stats,
  isLast,
}: {
  step: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: () => void;
  actionLabel?: string;
  stats?: { label: string; value: string }[];
  isLast?: boolean;
}) {
  const t = useTranslations();
  return (
    <div className="flex items-start gap-4 mb-4 relative">
      <div className="flex flex-col items-center shrink-0">
        <div className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-md shadow-primary/20">
          {step}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 min-h-12 bg-gradient-to-b from-primary/40 to-primary/5 mt-2" />
        )}
      </div>

      <Card className="flex-1 transition-all duration-300 hover:shadow-md group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                {icon}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-base">{title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                {stats && stats.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {stats.map((s) => (
                      <div key={s.label} className="flex items-center gap-1.5 text-xs">
                        <span className="font-semibold text-foreground">{s.value}</span>
                        <span className="text-muted-foreground">{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {action && (
              <Button size="sm" className="shrink-0 gap-1.5" onClick={action}>
                {actionLabel ?? t('common.go')} <ArrowRight className="size-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ErpDashboard() {
  const router = useRouter();
  const t = useTranslations();
  const { data: sessionData } = trpc.auth.session.useQuery();
  const { data: summary } = trpc.reports.summary.useQuery();
  const { format: currencyFormat, symbol } = useCurrency();
  const { formatShortDate } = useDateFormat();
  const { data: topItems } = trpc.reports.topItems.useQuery();
  const { data: recentPOs } = trpc.purchaseOrders.list.useQuery({
    limit: 5,
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const { data: recentInvoices } = trpc.invoices.list.useQuery({
    limit: 5,
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const poList = Array.isArray(recentPOs) ? recentPOs : ((recentPOs as any)?.data ?? []);
  const invoiceList = Array.isArray(recentInvoices)
    ? recentInvoices
    : ((recentInvoices as any)?.data ?? []);

  const pendingPOs = poList.filter((p: any) =>
    ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(p.status),
  ).length;
  const receivedPOs = poList.filter((p: any) => p.status === 'RECEIVED').length;
  const orderedPOs = poList.filter((p: any) => p.status === 'ORDERED').length;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20 pb-12">
      <Header title={t('dashboard.title')} />

      <main className="flex-1 p-4 lg:p-8 space-y-8 max-w-360 mx-auto w-full">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 lg:p-8 text-primary-foreground shadow-2xl shadow-primary/30">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_70%)]" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                {new Date().getHours() < 12
                  ? t('dashboard.greetingMorning')
                  : new Date().getHours() < 17
                    ? t('dashboard.greetingAfternoon')
                    : t('dashboard.greetingEvening')}
                {sessionData?.user?.name ? `, ${sessionData.user.name.split(' ')[0]}` : ''}
              </h1>
              <p className="text-primary-foreground/80 mt-1 text-sm lg:text-base max-w-xl">
                {t('dashboard.greetingDescription')}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 bg-white/20 text-white hover:bg-white/30 border-0"
                onClick={() => router.push('/erp/purchase-orders/new')}
              >
                <Plus className="size-4" /> {t('dashboard.newPO')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 bg-white/20 text-white hover:bg-white/30 border-0"
                onClick={() => router.push('/erp/invoices/new')}
              >
                <Receipt className="size-4" /> {t('dashboard.newInvoice')}
              </Button>
            </div>
          </div>
        </div>

        <section>
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="size-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">{t('dashboard.procureToSell')}</h2>
          </div>
          <div className="space-y-0">
            <WorkflowStep
              step={1}
              title={t('dashboard.step1Title')}
              description={t('dashboard.step1Desc')}
              icon={<ShoppingCart className="size-5" />}
              action={() => router.push('/erp/purchase-orders/new')}
              actionLabel={t('dashboard.newPO')}
              stats={[
                { label: t('dashboard.step1StatsPending'), value: String(pendingPOs) },
                { label: t('dashboard.step1StatsTotalPOs'), value: String(summary?.purchases.count ?? 0) },
                {
                  label: t('dashboard.step1StatsValue'),
                  value: summary ? currencyFormat(summary.purchases.total) : '—',
                },
              ]}
            />
            <WorkflowStep
              step={2}
              title={t('dashboard.step2Title')}
              description={t('dashboard.step2Desc')}
              icon={<Package className="size-5" />}
              action={() => router.push('/erp/purchase-orders')}
              actionLabel={t('common.receive')}
              stats={[
                { label: t('dashboard.step2StatsAwaiting'), value: String(orderedPOs) },
                { label: t('dashboard.step2StatsReceived'), value: String(receivedPOs) },
                { label: t('dashboard.step2StatsInStock'), value: String(summary?.inventory.itemCount ?? 0) },
              ]}
            />
            <WorkflowStep
              step={3}
              title={t('dashboard.step3Title')}
              description={t('dashboard.step3Desc')}
              icon={<Receipt className="size-5" />}
              action={() => router.push('/erp/invoices')}
              actionLabel={t('dashboard.newInvoice')}
              stats={[
                { label: t('dashboard.step3StatsInvoiced'), value: String(summary?.revenue.count ?? 0) },
                {
                  label: t('dashboard.step3StatsRevenue'),
                  value: summary ? currencyFormat(summary.revenue.total) : '—',
                },
                {
                  label: t('dashboard.step3StatsOutstanding'),
                  value: summary ? currencyFormat(summary.outstanding.total) : '—',
                },
              ]}
              isLast
            />
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="size-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">{t('dashboard.keyMetrics')}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
            <StatCard
              title={t('dashboard.inventory')}
              value={String(summary?.inventory.itemCount ?? 0)}
              sub={t('dashboard.lowStockItems', { n: summary?.inventory.lowStockCount ?? 0 })}
              icon={<Box className="size-4" />}
              trend={
                summary?.inventory.lowStockCount
                  ? {
                      dir: 'down',
                      label: t('dashboard.needsReordering', { n: summary.inventory.lowStockCount }),
                    }
                  : undefined
              }
              href="/erp/items"
            />
            <StatCard
              title={t('dashboard.customers')}
              value={String(summary?.customers.activeCount ?? 0)}
              sub={t('dashboard.activeAccounts')}
              icon={<Users className="size-4" />}
              href="/erp/customers"
            />
            <StatCard
              title={t('dashboard.suppliers')}
              value={String(summary?.suppliers.activeCount ?? 0)}
              sub={t('dashboard.activeVendors')}
              icon={<Truck className="size-4" />}
              href="/erp/suppliers"
            />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ClipboardList className="size-4 text-primary" /> {t('dashboard.recentPOs')}
                </CardTitle>
                <CardDescription>{t('dashboard.recentPOsDesc')}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() => router.push('/erp/purchase-orders')}
              >
                {t('dashboard.viewAll')} <ArrowRight className="size-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {poList.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <ShoppingCart className="size-8 mb-2 opacity-30" />
                  <p className="text-sm">{t('dashboard.noPOs')}</p>
                  <Button variant="link" size="sm" onClick={() => router.push('/erp/purchase-orders/new')} className="mt-1">
                    {t('dashboard.createFirstPO')}
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {poList.map((po: any) => (
                    <div
                      key={po.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/erp/purchase-orders/${po.id}`)}
                    >
                      <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileDown className="size-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{po.serial}</span>
                          <Badge variant="outline" className="text-[10px] h-4">
                            {po.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {po.supplier?.name ?? '—'} ·{' '}
                          {po.date ? formatShortDate(po.date) : '—'}
                        </p>
                      </div>
                      <span className="text-sm font-semibold shrink-0">
                        {Number(po.total).toFixed(0)} {po.currency}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Receipt className="size-4 text-primary" /> {t('dashboard.recentInvoices')}
                </CardTitle>
                <CardDescription>{t('dashboard.recentInvoicesDesc')}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() => router.push('/erp/invoices')}
              >
                {t('dashboard.viewAll')} <ArrowRight className="size-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {invoiceList.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <Receipt className="size-8 mb-2 opacity-30" />
                  <p className="text-sm">{t('dashboard.noInvoices')}</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-1"
                    onClick={() => router.push('/erp/invoices')}
                  >
                    {t('dashboard.createFirstInvoice')}
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {invoiceList.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Receipt className="size-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{inv.serial}</span>
                          <Badge variant="outline" className="text-[10px] h-4">
                            {inv.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {inv.customer?.name ?? '—'} ·{' '}
                          {inv.date ? formatShortDate(inv.date) : '—'}
                        </p>
                      </div>
                      <span className="text-sm font-semibold shrink-0">
                        {Number(inv.total).toFixed(0)} {inv.currency}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {topItems && topItems.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="size-5 text-primary" />
              <h2 className="text-lg font-bold tracking-tight">{t('dashboard.topSellingItems')}</h2>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {topItems.slice(0, 5).map((item: any, i: number) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                      <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Package className="size-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.sku ?? '—'} · {currencyFormat(item.salesPrice)}{t('dashboard.perUnit')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{item.totalSold.toFixed(0)} {t('dashboard.sold')}</p>
                        <p className="text-xs text-muted-foreground">
                          {currencyFormat(item.totalRevenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        <Separator />
        <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
          <Link href="/erp/purchase-orders" className="hover:text-foreground transition-colors">
            {t('layout.purchaseOrders')}
          </Link>
          <span>·</span>
          <Link href="/erp/invoices" className="hover:text-foreground transition-colors">
            {t('layout.invoices')}
          </Link>
          <span>·</span>
          <Link href="/erp/items" className="hover:text-foreground transition-colors">
            {t('layout.items')}
          </Link>
          <span>·</span>
          <Link href="/erp/customers" className="hover:text-foreground transition-colors">
            {t('layout.customers')}
          </Link>
          <span>·</span>
          <Link href="/erp/suppliers" className="hover:text-foreground transition-colors">
            {t('layout.suppliers')}
          </Link>
          <span>·</span>
          <Link href="/erp/stock" className="hover:text-foreground transition-colors">
            {t('layout.stockLevels')}
          </Link>
        </div>
      </main>
    </div>
  );
}
