import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FileText, Calendar } from 'lucide-react';
import { HTMLAttributes } from 'react';
import { cn, formatAmount } from '@/lib/utils';
import { RouterOutputs } from '@/lib/trpc/client';

type PurchaseOrderListItem = RouterOutputs['purchaseOrders']['list'][number];

interface PO_List_Item_Props extends Omit<HTMLAttributes<HTMLDivElement>, 'data'> {
  data: PurchaseOrderListItem;
}

export function PO_List_Item({ data, className, ...props }: PO_List_Item_Props) {
  const { serial, status, date, expectedDate, total, supplier } = data;

  return (
    <div className={cn('flex h-18 items-center gap-3 p-3', className)} {...props}>
      {/* Icon */}
      <Avatar className="size-11 rounded-lg shrink-0 after:border-0">
        <AvatarFallback className="rounded-lg transition-colors">
          <FileText className="size-6" />
        </AvatarFallback>
      </Avatar>

      {/* Main Info */}
      {serial && (
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{serial}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground truncate">{supplier?.name ?? 'Unknown Supplier'}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground truncate">{status}</span>
          </div>
        </div>
      )}

      {/* Right Section */}
      <div className="text-right text-xs space-y-0.5">
        {/* Total */}
        <p className="flex items-center justify-end gap-1 text-primary font-mono font-semibold">
          {formatAmount(Number(total))}
        </p>

        {/* Dates */}
        {date && (
          <p className="flex items-center justify-end gap-1 text-muted-foreground">
            <Calendar className="size-4" />
            {new Date(date).toLocaleDateString()}
          </p>
        )}

        {expectedDate && !date && (
          <p className="flex items-center justify-end gap-1 text-muted-foreground">
            ETA: {new Date(expectedDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
