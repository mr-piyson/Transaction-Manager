'use client';

import { useState, type ReactElement } from 'react';
import { History, ArrowUpRight, ArrowDownRight, Package, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc/client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

export function StockHistoryDialog({
  itemId,
  warehouseId,
  itemName,
  children,
}: {
  itemId: string;
  warehouseId: string;
  itemName: string;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);

  const { data: movements, isLoading } = trpc.stock.movements.useQuery(
    { itemId, warehouseId },
    { enabled: open }
  );

  const getMovementIcon = (type: string, qty: number) => {
    if (type === 'TRANSFER') return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
    if (qty > 0) return <ArrowDownRight className="h-4 w-4 text-emerald-500" />;
    return <ArrowUpRight className="h-4 w-4 text-destructive" />;
  };

  const getMovementColor = (type: string, qty: number) => {
    if (type === 'TRANSFER') return 'text-blue-500 bg-blue-500/10';
    if (qty > 0) return 'text-emerald-500 bg-emerald-500/10';
    return 'text-destructive bg-destructive/10';
  };

  const formatType = (type: string) => {
    return type.replace(/_/g, ' ');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Stock History
          </DialogTitle>
          <DialogDescription>
            Recent movements for <strong className="text-foreground">{itemName}</strong> at this
            location.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : movements?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 opacity-20 mb-4" />
              <p>No movement history found.</p>
            </div>
          ) : (
            <div className="relative border-l border-border/50 ml-4 space-y-6 pb-4">
              {movements?.map((m) => {
                const isPositive = m.quantity > 0;
                const sign = isPositive ? '+' : '';

                return (
                  <div key={m.id} className="relative pl-6">
                    <span
                      className={`absolute -left-3 top-1 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background ${getMovementColor(m.type, m.quantity)}`}
                    >
                      {getMovementIcon(m.type, m.quantity)}
                    </span>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold tracking-wider"
                          >
                            {formatType(m.type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(m.createdAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        {m.notes && <p className="mt-1.5 text-sm text-foreground">{m.notes}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">
                          By {m.user?.name || 'System'}
                        </p>
                      </div>
                      <div className="sm:text-right font-mono mt-2 sm:mt-0">
                        <span
                          className={`font-bold ${isPositive ? 'text-emerald-500' : 'text-destructive'}`}
                        >
                          {sign}
                          {m.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
