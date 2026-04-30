'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Package, AlertTriangle, Search, Banknote, MapPinIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatAmount, cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export default function WarehousesOverviewPage() {
  const [search, setSearch] = useState('');
  const { data: stockData, isLoading: isLoadingStock } = trpc.stock.levels.useQuery({ search });
  const { data: valuationData, isLoading: isLoadingValuation } = trpc.stock.valuation.useQuery({});

  const lowStockItems = stockData?.items.filter(item => item.isBelowMin) || [];
  const totalStockItems = stockData?.items.reduce((acc, curr) => acc + curr.quantity, 0) || 0;

  return (
    <div className="flex-1 overflow-auto bg-background/50 h-full p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Overview</h1>
          <p className="text-muted-foreground mt-2">Manage your inventory and monitor stock levels across all locations.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card/60 backdrop-blur border-primary/10 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Banknote className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingValuation ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatAmount(Number(valuationData?.grandTotal || 0))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Valuation based on purchase price</p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur border-primary/10 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Items in Stock</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingStock ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{totalStockItems.toLocaleString()}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Total quantity across all warehouses</p>
            </CardContent>
          </Card>

          <Card className={cn("bg-card/60 backdrop-blur shadow-sm transition-colors", lowStockItems.length > 0 ? "border-warning/50 bg-warning/5" : "border-primary/10")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", lowStockItems.length > 0 ? "bg-warning/20" : "bg-muted")}>
                <AlertTriangle className={cn("h-4 w-4", lowStockItems.length > 0 ? "text-warning-foreground" : "text-muted-foreground")} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingStock ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className={cn("text-2xl font-bold", lowStockItems.length > 0 && "text-warning-foreground")}>
                  {lowStockItems.length}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Items below minimum threshold</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-muted/20 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Inventory List</CardTitle>
                <CardDescription>Detailed view of all products across your warehouses.</CardDescription>
              </div>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by SKU or name..."
                  className="pl-9 w-full bg-background/50 focus-visible:bg-background"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[300px]">Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Value</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingStock || isLoadingValuation ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : stockData?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No stock found. {search ? "Try a different search term." : "Start by receiving a Purchase Order."}
                    </TableCell>
                  </TableRow>
                ) : (
                  stockData?.items.map((stock) => {
                    const valuation = valuationData?.rows.find(
                      v => v.itemId === stock.itemId && v.warehouseId === stock.warehouseId
                    );
                    
                    return (
                      <TableRow key={stock.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">
                          {stock.item.name}
                        </TableCell>
                        <TableCell>
                          {stock.item.sku ? (
                            <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                              {stock.item.sku}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPinIcon className="h-3.5 w-3.5" />
                            <span className="text-sm">{stock.warehouse.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {stock.isBelowMin && (
                              <AlertTriangle className="h-4 w-4 text-warning" />
                            )}
                            <span className={cn(
                              "font-mono font-bold",
                              stock.isBelowMin ? "text-warning" : "text-foreground"
                            )}>
                              {stock.quantity.toString()}
                            </span>
                            <span className="text-[10px] text-muted-foreground w-6 text-left">
                              {stock.item.unit}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">
                          {formatAmount(Number(stock.item.purchasePrice))}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-foreground">
                          {valuation ? formatAmount(Number(valuation.totalValue)) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
