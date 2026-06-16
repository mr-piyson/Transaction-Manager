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
import React from 'react';
import { Header } from '@/app/app/App-Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { usePOForm } from '@/components/dialogs/poForm';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ─── Stat Card ──────────────────────────────────────────────────────────────

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

// ─── Workflow Step ──────────────────────────────────────────────────────────

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
  return (
    <div className="flex items-start gap-4 mb-4 relative">
      {/* Step number + connecting line */}
      <div className="flex flex-col items-center shrink-0">
        <div className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-md shadow-primary/20">
          {step}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 min-h-12 bg-gradient-to-b from-primary/40 to-primary/5 mt-2" />
        )}
      </div>

      {/* Content */}
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
                {actionLabel ?? 'Go'} <ArrowRight className="size-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export default function App_Page() {
  const router = useRouter();
  const { data: sessionData } = trpc.auth.session.useQuery();
  const { data: summary } = trpc.reports.summary.useQuery();
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
  const { openCreate: openCreatePO } = usePOForm();

  const poList = Array.isArray(recentPOs) ? recentPOs : ((recentPOs as any)?.data ?? []);
  const invoiceList = Array.isArray(recentInvoices)
    ? recentInvoices
    : ((recentInvoices as any)?.data ?? []);

  // Count POs by status
  const pendingPOs = poList.filter((p: any) =>
    ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(p.status),
  ).length;
  const receivedPOs = poList.filter((p: any) => p.status === 'RECEIVED').length;
  const orderedPOs = poList.filter((p: any) => p.status === 'ORDERED').length;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20 pb-12">
      <Header title="Dashboard" />

      <main className="flex-1 p-4 lg:p-8 space-y-8 max-w-360 mx-auto w-full">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 lg:p-8 text-primary-foreground shadow-2xl shadow-primary/30">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_70%)]" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                Good{' '}
                {new Date().getHours() < 12
                  ? 'morning'
                  : new Date().getHours() < 17
                    ? 'afternoon'
                    : 'evening'}
                {sessionData?.user?.name ? `, ${sessionData.user.name.split(' ')[0]}` : ''}
              </h1>
              <p className="text-primary-foreground/80 mt-1 text-sm lg:text-base max-w-xl">
                Here&apos;s your business overview for {format(new Date(), 'EEEE, MMMM do, yyyy')}.
                Track purchases, inventory, and sales in one place.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 bg-white/20 text-white hover:bg-white/30 border-0"
                onClick={() => openCreatePO()}
              >
                <Plus className="size-4" /> New PO
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 bg-white/20 text-white hover:bg-white/30 border-0"
                onClick={() => router.push('/app/invoices')}
              >
                <Receipt className="size-4" /> New Invoice
              </Button>
            </div>
          </div>
        </div>

        {/* Workflow */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="size-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Procure-to-Sell Workflow</h2>
          </div>
          <div className="space-y-0">
            <WorkflowStep
              step={1}
              title="Create a Purchase Order"
              description="Order stock from your suppliers. Define items, quantities, and negotiated prices. Once approved, the PO is sent to the supplier."
              icon={<ShoppingCart className="size-5" />}
              action={() => openCreatePO()}
              actionLabel="New PO"
              stats={[
                { label: 'pending', value: String(pendingPOs) },
                { label: 'total POs', value: String(summary?.purchases.count ?? 0) },
                {
                  label: 'value',
                  value: `${(summary?.purchases.total ?? 0).toFixed(0)} ${summary ? 'BHD' : ''}`,
                },
              ]}
            />
            <WorkflowStep
              step={2}
              title="Receive Stock"
              description="When goods arrive, mark them as received. Stock is automatically updated in your warehouse and inventory levels are adjusted."
              icon={<Package className="size-5" />}
              action={() => router.push('/app/purchase-orders')}
              actionLabel="Receive"
              stats={[
                { label: 'awaiting receipt', value: String(orderedPOs) },
                { label: 'received', value: String(receivedPOs) },
                { label: 'items in stock', value: String(summary?.inventory.itemCount ?? 0) },
              ]}
            />
            <WorkflowStep
              step={3}
              title="Sell to Customers with Margin"
              description="Create an invoice for a customer using items from stock. Your configured sales price (with margin) is applied automatically, and stock is deducted on confirmation."
              icon={<Receipt className="size-5" />}
              action={() => router.push('/app/invoices')}
              actionLabel="New Invoice"
              stats={[
                { label: 'invoiced', value: String(summary?.revenue.count ?? 0) },
                {
                  label: 'revenue',
                  value: `${(summary?.revenue.total ?? 0).toFixed(0)} ${summary ? 'BHD' : ''}`,
                },
                {
                  label: 'outstanding',
                  value: `${(summary?.outstanding.total ?? 0).toFixed(0)} ${summary ? 'BHD' : ''}`,
                },
              ]}
              isLast
            />
          </div>
        </section>

        {/* KPI Grid */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="size-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Key Metrics</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
            <StatCard
              title="Inventory"
              value={String(summary?.inventory.itemCount ?? 0)}
              sub={`${summary?.inventory.lowStockCount ?? 0} low stock items`}
              icon={<Box className="size-4" />}
              trend={
                summary?.inventory.lowStockCount
                  ? {
                      dir: 'down',
                      label: `${summary.inventory.lowStockCount} items need reordering`,
                    }
                  : undefined
              }
              href="/app/items"
            />
            <StatCard
              title="Customers"
              value={String(summary?.customers.activeCount ?? 0)}
              sub="active accounts"
              icon={<Users className="size-4" />}
              href="/app/customers"
            />
            <StatCard
              title="Suppliers"
              value={String(summary?.suppliers.activeCount ?? 0)}
              sub="active vendors"
              icon={<Truck className="size-4" />}
              href="/app/suppliers"
            />
          </div>
        </section>

        {/* Recent Activity Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent POs */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ClipboardList className="size-4 text-primary" /> Recent Purchase Orders
                </CardTitle>
                <CardDescription>Latest 5 purchase orders</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() => router.push('/app/purchase-orders')}
              >
                View all <ArrowRight className="size-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {poList.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <ShoppingCart className="size-8 mb-2 opacity-30" />
                  <p className="text-sm">No purchase orders yet</p>
                  <Button variant="link" size="sm" onClick={() => openCreatePO()} className="mt-1">
                    Create your first PO
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {poList.map((po: any) => (
                    <div
                      key={po.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/app/purchase-orders/${po.id}`)}
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
                          {po.date ? format(new Date(po.date), 'dd MMM') : '—'}
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

          {/* Recent Invoices */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Receipt className="size-4 text-primary" /> Recent Invoices
                </CardTitle>
                <CardDescription>Latest 5 invoices</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() => router.push('/app/invoices')}
              >
                View all <ArrowRight className="size-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {invoiceList.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <Receipt className="size-8 mb-2 opacity-30" />
                  <p className="text-sm">No invoices yet</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-1"
                    onClick={() => router.push('/app/invoices')}
                  >
                    Create your first invoice
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
                          {inv.date ? format(new Date(inv.date), 'dd MMM') : '—'}
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

        {/* Top Selling Items */}
        {topItems && topItems.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="size-5 text-primary" />
              <h2 className="text-lg font-bold tracking-tight">Top Selling Items</h2>
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
                          {item.sku ?? '—'} · {item.salesPrice.toFixed(3)} BHD/unit
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{item.totalSold.toFixed(0)} sold</p>
                        <p className="text-xs text-muted-foreground">
                          {item.totalRevenue.toFixed(0)} BHD
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Quick links footer */}
        <Separator />
        <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
          <Link href="/app/purchase-orders" className="hover:text-foreground transition-colors">
            Purchase Orders
          </Link>
          <span>·</span>
          <Link href="/app/invoices" className="hover:text-foreground transition-colors">
            Invoices
          </Link>
          <span>·</span>
          <Link href="/app/items" className="hover:text-foreground transition-colors">
            Items
          </Link>
          <span>·</span>
          <Link href="/app/customers" className="hover:text-foreground transition-colors">
            Customers
          </Link>
          <span>·</span>
          <Link href="/app/suppliers" className="hover:text-foreground transition-colors">
            Suppliers
          </Link>
          <span>·</span>
          <Link href="/app/stock" className="hover:text-foreground transition-colors">
            Stock
          </Link>
        </div>
      </main>
    </div>
  );
}
