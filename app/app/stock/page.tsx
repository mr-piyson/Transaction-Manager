'use client';

import { ListView } from '@/components/list-view';
import { Header } from '../App-Header';
import { Package, Warehouse, AlertTriangle, TrendingUp, History } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { StockAdjustmentDialog } from './stock-adjustment-dialog';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function StockDashboardPage() {
  const router = useRouter();
  const { data: stockLevels, isLoading: loadingStocks } = trpc.stock.getStocks.useQuery();
  const { data: movements, isLoading: loadingHistory } = trpc.stock.getStockMovements.useQuery();

  // Aggregate stats
  const totalItems = stockLevels?.reduce((acc, s) => acc + s.quantity, 0) || 0;
  const lowStockCount = stockLevels?.filter((s) => s.quantity <= s.item.minStock).length || 0;

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Current Inventory" transparent sticky>
        <StockAdjustmentDialog />
      </Header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 md:px-8 pb-0">
        <Card className="bg-primary/5 border-primary/10 transition-all hover:shadow-md cursor-pointer">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Package className="size-5 text-primary" />
              {totalItems}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-nowrap">
              Across all locations
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'transition-all hover:shadow-md cursor-pointer',
            lowStockCount > 0 ? 'bg-amber-500/5 border-amber-500/10' : '',
          )}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold flex items-center gap-2 ${lowStockCount > 0 ? 'text-amber-600' : ''}`}
            >
              <AlertTriangle className="size-5" />
              {lowStockCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-nowrap">
              Items below safety threshold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 md:px-8 flex-1 items-start">
        {/* Real-time Levels List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
              <TrendingUp className="size-4" />
              Live Stock Levels
            </h3>
          </div>

          <ListView
            data={stockLevels || []}
            isLoading={loadingStocks}
            searchFields={[]}
            emptyTitle="No Physical Stock"
            emptyDescription="Incoming purchases will auto-populate this view."
            cardRenderer={(stock) => {
              const stockPercentage = Math.min(
                (stock.quantity / (stock.item.minStock * 2 || 100)) * 100,
                100,
              );
              const isLow = stock.quantity <= stock.item.minStock;

              return (
                <div
                  onClick={() => router.push(`/app/stock/${stock.item.id}`)}
                  className="flex flex-col gap-3 px-4 py-4 hover:bg-accent/50 transition-colors cursor-pointer border-b border-border/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted p-2 rounded-lg">
                        <Package className="size-5 text-foreground/70" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm leading-none mb-1">
                          {stock.item.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/50 w-fit">
                          <Warehouse className="size-3" />
                          {stock.warehouse.name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-lg font-bold leading-none ${isLow ? 'text-amber-600' : ''}`}
                      >
                        {stock.quantity}{' '}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {stock.item.unit}
                        </span>
                      </div>
                      {isLow && (
                        <span className="text-[10px] font-medium text-amber-600/80 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/10">
                          Low Stock
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                      <span>Threshold Progress</span>
                      <span>Target: {stock.item.minStock * 2}</span>
                    </div>
                    <Progress
                      value={stockPercentage}
                      className={`h-1.5 ${isLow ? 'bg-amber-100 dark:bg-amber-950/20' : ''}`}
                    />
                  </div>
                </div>
              );
            }}
          />
        </div>

        {/* Audit Log / History Sidebar */}
        <div className="space-y-4 h-full">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
            <History className="size-4" />
            Recent Activity
          </h3>
          <div className="bg-card border border-border/60 rounded-xl divide-y divide-border/40 overflow-hidden shadow-sm">
            {loadingHistory ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : movements?.length === 0 ? (
              <div className="p-8 text-center text-[10px] text-muted-foreground italic">
                No recent movements
              </div>
            ) : (
              movements?.slice(0, 8).map((mv) => (
                <div key={mv.id} className="p-3 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <Badge
                      variant={
                        mv.type.includes('INBOUND') || mv.type.includes('UP')
                          ? 'default'
                          : mv.type.includes('OUTBOUND') || mv.type.includes('DOWN')
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="text-[9px] px-1.5 h-4 uppercase tracking-tighter"
                    >
                      {mv.type.replace('_', ' ')}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(mv.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="font-medium text-foreground/90 truncate">{mv.item.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {mv.quantity > 0 ? '+' : ''}
                    {mv.quantity} units {mv.notes ? `• ${mv.notes}` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
