'use client';

import { Header } from '@/app/app/App-Header';
import {
  Plus,
  ShoppingCart,
  Users,
  Store,
  Package,
  FileText,
  Wallet,
  TrendingUp,
  TrendingDown,
  LayoutDashboard,
  Box,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { CreateSupplierDialog } from '@/app/app/suppliers/create-supplier-dialog';
import { CreateCustomerDialog } from '@/app/app/customers/create-customer-dialog';
import { CreatePurchaseDialog } from '@/app/app/purchases/create-purchase-dialog';
import { StockAdjustmentDialog } from '@/app/app/stock/stock-adjustment-dialog';
import { CardsSection } from '@/app/app/dashboard/cards-section';
import { ChartAreaInteractive } from '@/app/app/dashboard/AreaChart';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import React from 'react';

// ---------------------------------------------------------------------------
// Quick Action Card Component
// ---------------------------------------------------------------------------
function QuickActionCard({
  label,
  icon,
  onClick,
  className,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const content = (
    <div
      className={cn(
        'group flex flex-col items-center justify-center gap-3 p-6 h-full w-full',
        'rounded-3xl border bg-background shadow-sm transition-all duration-300',
        'hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 cursor-pointer',
        className,
      )}
    >
      <div className="p-4 rounded-2xl bg-current/10 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <span className="text-md font-black uppercase tracking-widest text-foreground/80 group-hover:text-primary">
        {label}
      </span>
      <ArrowRight className="size-3 opacity-0 -translate-x-2 transition-all group-hover:opacity-40 group-hover:translate-x-0" />
    </div>
  );

  if (children) {
    return (
      <div className="aspect-square">
        {React.cloneElement(children as React.ReactElement, {}, content)}
      </div>
    );
  }

  return (
    <button onClick={onClick} className="aspect-square text-left">
      {content}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function App_Page() {
  const router = useRouter();
  const { data: user } = trpc.auth.getSession.useQuery();

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <Header title={`Welcome, ${user?.user?.name?.split(' ')[0] || 'User'}`} sticky />

      <main className="flex-1 p-6 lg:p-10 space-y-12 max-w-[1600px] mx-auto w-full">
        {/* Welcome Section / Stats Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-foreground">
              Dashboard Overview
            </h2>
            <p className="text-muted-foreground font-medium">
              Real-time summary of your organization performance.
            </p>
          </div>
          <Button
            className="rounded-full px-6 shadow-lg shadow-primary/20 bg-primary hover:scale-105 transition-transform"
            onClick={() => router.push('/app/invoices/new')}
          >
            <Plus className="size-4 mr-2" />
            Create New Invoice
          </Button>
        </div>

        {/* Quick Actions Grid */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 bg-primary rounded-full" />
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
              Operational Shortcuts
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <QuickActionCard
              label="New Invoice"
              icon={<FileText className="size-6" />}
              onClick={() => router.push('/app/invoices/new')}
              className="border-3  text-primary border-primary/50"
            />

            <QuickActionCard
              label="Purchase"
              icon={<ShoppingCart className="size-6" />}
              className="border-3  text-warning border-warning/50"
            >
              <CreatePurchaseDialog />
            </QuickActionCard>

            <QuickActionCard
              label="Supplier"
              icon={<Store className="size-6" />}
              className="border-3  text-success border-success/50"
            >
              <CreateSupplierDialog />
            </QuickActionCard>

            <QuickActionCard
              label="Customer"
              icon={<Users className="size-6" />}
              className="border-3  text-info border-info/50"
            >
              <CreateCustomerDialog />
            </QuickActionCard>

            <QuickActionCard
              label="Stock"
              icon={<Box className="size-6" />}
              className="border-3  text-destructive border-destructive/50"
            >
              <StockAdjustmentDialog />
            </QuickActionCard>

            <QuickActionCard
              label="Analytics"
              icon={<LayoutDashboard className="size-6" />}
              onClick={() => router.push('/app/dashboard')}
              className="border-3  text-foreground border-foreground/50"
            />
          </div>
        </section>

        {/* Analytics & Activity Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <TrendingUp className="size-5 text-emerald-500" />
                Revenue Analysis
              </h3>
              <Button variant="outline" size="sm" onClick={() => router.push('/app/dashboard')}>
                Detailed Report
              </Button>
            </div>
            <div className="bg-background rounded-3xl border shadow-sm overflow-hidden p-2">
              <ChartAreaInteractive />
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
              <Package className="size-5 text-amber-500" />
              Critical Inventory
            </h3>
            <RecentStockItems />
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function RecentStockItems() {
  const { data: stocks, isLoading } = trpc.stock.getStocks.useQuery();

  if (isLoading)
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-muted/20 animate-pulse rounded-2xl" />
        ))}
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border bg-background overflow-hidden shadow-sm divide-y">
        {stocks?.slice(0, 6).map((stock: any) => (
          <div
            key={stock.id}
            className="p-5 flex items-center gap-4 hover:bg-muted/30 transition-colors group"
          >
            <div className="size-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center transition-colors group-hover:bg-primary/10 group-hover:text-primary">
              <Package className="size-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-foreground truncate">
                {stock.stockItem.name}
              </div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                <Truck className="size-3" />
                {stock.warehouse.name}
              </div>
            </div>
            <div className="text-right">
              <div
                className={`text-base font-black ${stock.quantity <= (stock.stockItem.minStock || 5) ? 'text-destructive' : 'text-foreground'}`}
              >
                {stock.quantity}
              </div>
              <div className="text-[9px] uppercase font-black text-muted-foreground/60 tracking-tighter">
                In Stock
              </div>
            </div>
          </div>
        ))}
        {(!stocks || stocks.length === 0) && (
          <div className="p-12 text-center space-y-2 bg-muted/5">
            <Box className="size-10 mx-auto opacity-10" />
            <p className="text-sm text-muted-foreground font-medium italic">
              No stock entries found.
            </p>
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        className="w-full rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all text-sm font-bold h-14"
        onClick={() => {}} // Could link to full stock list
      >
        View Full Inventory
      </Button>
    </div>
  );
}
