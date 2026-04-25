import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FileText, Calendar, DollarSign } from 'lucide-react';
import { HTMLAttributes } from 'react';
import { cn, formatAmount } from '@/lib/utils';
import { PurchaseOrder } from '@prisma/client';

interface PO_List_Item_Props extends HTMLAttributes<HTMLDivElement> {
  data?: PurchaseOrder;
}

export function PO_List_Item({ data, className, ...props }: PO_List_Item_Props) {
  const { serial, status, date, expectedDate, total, currency } = data || {};

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
          <p className="text-sm text-muted-foreground truncate">{status}</p>
        </div>
      )}

      {/* Right Section */}
      <div className="text-right text-xs space-y-0.5">
        {/* Total */}
        <p className="flex items-center justify-end gap-1 text-primary font-mono font-semibold">
          {formatAmount(total, currency)}
        </p>

        {/* Dates */}
        {date && (
          <p className="flex items-center justify-end gap-1 text-muted-foreground">
            <Calendar className="size-4" />
            {new Date(date).toLocaleDateString()}
          </p>
        )}

        {expectedDate && (
          <p className="flex items-center justify-end gap-1 text-muted-foreground">
            ETA: {new Date(expectedDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
