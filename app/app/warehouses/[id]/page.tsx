'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  MapPinIcon,
  StickyNote,
  AlertCircle,
  MoreVertical,
  Trash2,
  Package,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Scale,
  History,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { trpc } from '@/lib/trpc/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { WarehouseFormDialog } from '../warehouse-form-dialog';
import { cn } from '@/lib/utils';
import { StockAdjustDialog } from '../components/stock-adjust-dialog';
import { StockTransferDialog } from '../components/stock-transfer-dialog';
import { StockHistoryDialog } from '../components/stock-history-dialog';

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground whitespace-pre-wrap">
          {value}
        </p>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count }: { icon: React.ElementType; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="size-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {count !== undefined && (
        <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0">
          {count}
        </Badge>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-pulse">
      <Skeleton className="h-8 w-32" />
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex flex-col gap-4 lg:w-72 xl:w-80 shrink-0">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: warehouse, isLoading, error } = trpc.warehouses.getById.useQuery({ id });

  const deleteMutation = trpc.warehouses.delete.useMutation({
    onSuccess: () => router.push('/app/warehouses'),
    onError: (err) => alert(err.message),
  });

  if (isLoading) return <DetailSkeleton />;

  if (error || !warehouse) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
        <AlertCircle className="size-10 text-muted-foreground" />
        <p className="font-semibold">Warehouse not found</p>
        <Button variant="outline" onClick={() => router.push('/app/warehouses')}>
          Go back
        </Button>
      </div>
    );
  }

  function handleDelete() {
    if (!confirm(`Delete "${warehouse!.name}"? This action cannot be undone.`)) return;
    deleteMutation.mutate({ id });
  }

  const stockList = warehouse.stock || [];
  const totalItems = stockList.length;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen bg-background">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push('/app/warehouses')}
        >
          <ArrowLeft className="size-4" />
          Warehouses
        </Button>

        <div className="flex items-center gap-2">
          <WarehouseFormDialog warehouse={warehouse as any}>
            <Button variant="outline" size="sm" className="gap-2">
              Edit
            </Button>
          </WarehouseFormDialog>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreVertical className="size-4" />
                </Button>
              }
            ></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={handleDelete}
                disabled={deleteMutation.isPending || warehouse.isDefault}
              >
                <Trash2 className="size-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT SIDEBAR */}
        <div className="flex flex-col gap-4 w-full lg:w-72 xl:w-80 shrink-0">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="h-16 w-full bg-secondary/90" />
            <div className="flex flex-col items-center -mt-8 pb-5 px-5">
              <Avatar className="flex size-16 items-center justify-center rounded-full shadow-lg ring-4 ring-background bg-card text-muted-foreground">
                <AvatarFallback>
                  <MapPinIcon size={32} />
                </AvatarFallback>
              </Avatar>

              <h1 className="mt-3 text-center text-lg font-bold text-foreground leading-tight">
                {warehouse.name}
              </h1>

              <div className="mt-2 flex items-center gap-2">
                {warehouse.isDefault && (
                  <Badge variant="default" className="text-xs">
                    <CheckCircle2 className="size-3 mr-1" /> Default Warehouse
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            <div className="px-5 py-2 divide-y divide-border/60">
              <InfoRow icon={MapPin} label="Address" value={warehouse.address} />
            </div>
          </div>

        </div>

        {/* RIGHT CONTENT AREA */}
        <div className="flex-1 w-full flex flex-col gap-4">
          <div className="rounded-xl border bg-card shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader icon={Package} title="Current Stock" count={totalItems} />
            </div>

            {totalItems === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <Package className="size-8 opacity-40" />
                <p className="text-sm">No items in stock at this location</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border/60 border rounded-lg">
                <div className="flex items-center gap-3 p-3 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider rounded-t-lg">
                  <div className="flex-1">Item</div>
                  <div className="w-24 text-right">Quantity</div>
                </div>
                {stockList.map((stk: any) => {
                  const isLowStock = stk.quantity <= (stk.item.minStock || 0);
                  return (
                    <div key={stk.id} className="flex items-center gap-3 p-3 hover:bg-muted/10 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{stk.item.name}</p>
                          {stk.item.sku && <Badge variant="outline" className="text-[10px] font-mono px-1.5 h-5">{stk.item.sku}</Badge>}
                        </div>
                      </div>
                      <div className="w-24 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isLowStock && <AlertTriangle className="size-4 text-warning" />}
                          <span className={cn("text-sm font-bold font-mono", isLowStock ? "text-warning" : "text-foreground")}>
                            {stk.quantity.toString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{stk.item.unit}</p>
                      </div>
                      
                      {/* ACTIONS MENU */}
                      <div>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreVertical className="size-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-48">
                            <StockHistoryDialog itemId={stk.item.id} warehouseId={warehouse.id} itemName={stk.item.name}>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <History className="mr-2 size-4" />
                                View History
                              </DropdownMenuItem>
                            </StockHistoryDialog>
                            <DropdownMenuSeparator />
                            <StockAdjustDialog itemId={stk.item.id} warehouseId={warehouse.id} itemName={stk.item.name} currentQuantity={stk.quantity}>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Scale className="mr-2 size-4" />
                                Adjust Stock
                              </DropdownMenuItem>
                            </StockAdjustDialog>
                            <StockTransferDialog itemId={stk.item.id} fromWarehouseId={warehouse.id} itemName={stk.item.name} currentQuantity={stk.quantity}>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <ArrowRightLeft className="mr-2 size-4" />
                                Transfer Stock
                              </DropdownMenuItem>
                            </StockTransferDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
