'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Header } from '../../App-Header';
import { 
  Package, 
  Warehouse, 
  History, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  User as UserIcon,
  Calendar,
  Box,
  LayoutDashboard
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StockDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params?.itemId as string;

  const { data: item, isLoading } = trpc.stock.getItemStockDetails.useQuery({ itemId });

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background/50 backdrop-blur-sm">
        <Loader2 className="size-10 animate-spin text-primary/60" />
        <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse">
          Loading inventory intelligence...
        </p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-8 text-center flex flex-col items-center gap-4">
        <div className="bg-destructive/10 p-4 rounded-full">
          <Package className="size-12 text-destructive opacity-50" />
        </div>
        <h2 className="text-2xl font-bold">Item Not Found</h2>
        <p className="text-muted-foreground max-w-md">
          The requested inventory item could not be located in your organization's database.
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const totalQuantity = item.stockEntries.reduce((acc, s) => acc + s.quantity, 0);
  const isLowStock = totalQuantity <= item.minStock;

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <Header 
        title={item.name} 
        icon={<Button variant="ghost" size="icon" className="mr-2" onClick={() => router.push('/app/stock')}><ArrowLeft className="size-5" /></Button>}
        transparent 
        sticky
      >
        <Badge variant={isLowStock ? 'destructive' : 'default'} className="uppercase tracking-widest text-[10px]">
          {isLowStock ? 'Low Stock Alert' : 'Stock Optimal'}
        </Badge>
      </Header>

      <div className="p-4 md:px-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-background border-border/50 shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-primary/20" />
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Total Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className={cn("text-3xl font-black", isLowStock ? "text-destructive" : "text-foreground")}>
                  {totalQuantity}
                </span>
                <span className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-tighter">
                  {item.unit}
                </span>
              </div>
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase">
                  <span>Safety Threshold</span>
                  <span>{item.minStock} {item.unit}</span>
                </div>
                <Progress value={Math.min((totalQuantity / (item.minStock * 2 || 100)) * 100, 100)} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background border-border/50 shadow-sm">
            <CardHeader className="pb-2 text-left">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Product Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Internal SKU</span>
                <Badge variant="outline" className="font-mono text-[10px] bg-muted/50">
                  {item.sku}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Global Type</span>
                <Badge variant="secondary" className="text-[9px] uppercase tracking-tighter">
                  {item.type}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Storage Locations</span>
                <span className="text-xs font-bold">{item.stockEntries.length} Warehouses</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background border-border/50 shadow-sm flex flex-col justify-center items-center p-6 bg-gradient-to-br from-background to-primary/5">
             <div className="bg-primary/10 p-4 rounded-2xl mb-3">
                <TrendingUp className="size-8 text-primary opacity-80" />
             </div>
             <div className="text-center">
                <div className="text-sm font-bold">Velocity Tracking</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-medium">Real-time stats enabled</div>
             </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Warehouse Distribution */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-foreground/80 px-1">
              <Warehouse className="size-4 text-primary" />
              Warehouse Distribution
            </h3>
            <div className="space-y-3">
              {item.stockEntries.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-border/60 rounded-2xl text-center text-xs text-muted-foreground italic">
                  No physical entries in any warehouse
                </div>
              ) : (
                item.stockEntries.map((se) => (
                  <Card key={se.id} className="border-none shadow-none bg-background border border-border/40 overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted p-2 rounded-xl">
                          <LayoutDashboard className="size-4 text-muted-foreground" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold leading-tight">{se.warehouse.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-40">
                            {se.warehouse.address || 'Standard Location'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-primary tabular-nums">
                          {se.quantity}
                        </div>
                        <div className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">
                          Available
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Audit Trail / Movement History */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-foreground/80 px-1">
              <History className="size-4 text-primary" />
              Movement Audit Trail
            </h3>
            <div className="bg-background border border-border/50 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border/50">
                      <th className="p-4 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Type</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Location</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Qty</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">Date / Context</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {item.stockMovements.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-muted-foreground italic">
                          No transaction history found for this item.
                        </td>
                      </tr>
                    ) : (
                      item.stockMovements.map((mv) => {
                        const isIn = mv.quantity > 0;
                        return (
                          <tr key={mv.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4">
                              <Badge 
                                variant={isIn ? 'default' : 'destructive'} 
                                className="text-[9px] px-1.5 h-5 uppercase tracking-tighter"
                              >
                                {mv.type.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-0.5">
                                {mv.type === 'TRANSFER' ? (
                                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                                    <span className="font-bold text-foreground/70">{mv.fromWarehouse?.name}</span>
                                    <span>→</span>
                                    <span className="font-bold text-foreground/70">{mv.toWarehouse?.name}</span>
                                  </div>
                                ) : (
                                  <span className="font-bold text-foreground/70">
                                    {mv.toWarehouse?.name || mv.fromWarehouse?.name || '---'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className={cn("inline-flex items-center gap-1 font-bold tabular-nums", isIn ? "text-success" : "text-destructive")}>
                                {isIn ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                                {isIn ? '+' : ''}{mv.quantity}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Calendar className="size-3" />
                                  <span>{new Date(mv.createdAt).toLocaleDateString()}</span>
                                  <span>{new Date(mv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                {mv.notes && <div className="text-[10px] text-muted-foreground/80 italic line-clamp-1">"{mv.notes}"</div>}
                                {mv.user && (
                                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60 font-medium">
                                    <UserIcon className="size-2.5" />
                                    <span>Modified by {mv.user.name}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
