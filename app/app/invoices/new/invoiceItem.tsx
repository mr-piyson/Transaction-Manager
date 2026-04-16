'use client';
import { UniversalContextMenu } from '@/components/context-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';
import { formatAmount } from '@/lib/utils';
import { Box, Trash2 } from 'lucide-react';

export default function InvoiceItemCard({
  line,
  onDelete,
  onUpdate,
}: {
  line: any;
  onDelete?: () => void;
  onUpdate?: (updated: any) => void;
}) {
  const utils = trpc.useUtils();
  const itemRef = (line as any).itemRef;

  const handleDelete = () => {
    onDelete?.();
  };

  return (
    <UniversalContextMenu
      items={[
        {
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          destructive: true,
          onClick: handleDelete,
        },
      ]}
    >
      <div className="flex flex-row justify-between items-center p-3 px-3 w-full bg-popover overflow-hidden hover:bg-muted/50 transition-colors group border-b last:border-0 border-border/50">
        <div className="flex flex-row items-center gap-3">
          <Avatar className="border-0 h-10 w-10 rounded-lg shrink-0">
            <AvatarImage src={itemRef?.imageUrl || ''} alt={line.description || 'Item'} />
            <AvatarFallback className="rounded-lg bg-foreground/5">
              <Box className="h-5 w-5 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium leading-none truncate">{line.description}</h3>
              {itemRef?.code && (
                <Badge variant="secondary" className="px-1 text-[10px] h-4">
                  {itemRef.code}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>{formatAmount(line.unitPrice)}</span>
              <span className="text-muted-foreground/60">× {Number(line.quantity)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center bg-muted/30 rounded-md p-0.5 border border-border/50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (Number(line.quantity) > 1) {
                  const newQty = Number(line.quantity) - 1;
                  onUpdate?.({
                    ...line,
                    quantity: newQty,
                    total: newQty * Number(line.unitPrice),
                  });
                }
              }}
              className="h-6 w-6 flex items-center justify-center hover:bg-background rounded-sm transition-colors"
            >
              -
            </button>
            <span className="w-8 text-center text-xs font-semibold tabular-nums">
              {Number(line.quantity)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newQty = Number(line.quantity) + 1;
                onUpdate?.({
                  ...line,
                  quantity: newQty,
                  total: newQty * Number(line.unitPrice),
                });
              }}
              className="h-6 w-6 flex items-center justify-center hover:bg-background rounded-sm transition-colors"
            >
              +
            </button>
          </div>

          <div className="text-sm font-semibold tabular-nums text-right min-w-20">
            {formatAmount(line.total)}
          </div>
        </div>
      </div>
    </UniversalContextMenu>
  );
}
