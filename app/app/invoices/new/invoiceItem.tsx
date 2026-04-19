'use client';
import { UniversalContextMenu } from '@/components/context-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { formatAmount, cn } from '@/lib/utils';
import { Box, EllipsisVertical, Trash2 } from 'lucide-react';

export default function InvoiceItemCard({
  key,
  line,
  onDelete,
  onUpdate,
}: {
  line: any;
  onDelete?: () => void;
  onUpdate?: (updated: any) => void;
  key: string;
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
      <div
        key={key}
        className="flex flex-row justify-between items-center p-3 px-3 w-full bg-background overflow-hidden hover:bg-muted/50 transition-colors group border-b last:border-0 border-border/50"
      >
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
              <Badge variant="outline" className="px-1 text-[9px] h-3.5 opacity-70">
                {itemRef?.type || 'ITEM'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>{formatAmount(line.unitPrice)}</span>
              <span className="text-muted-foreground/60">× {Number(line.quantity)}</span>
              {itemRef?.type === 'PRODUCT' && (
                <span
                  className={cn(
                    'ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-muted/50 font-medium',
                    (itemRef?.stockEntries?.reduce((acc: any, s: any) => acc + s.quantity, 0) ||
                      0) < Number(line.quantity)
                      ? 'text-destructive bg-destructive/10'
                      : 'text-muted-foreground',
                  )}
                >
                  Stock:{' '}
                  {itemRef?.stockEntries?.reduce((acc: any, s: any) => acc + s.quantity, 0) || 0}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-sm font-semibold tabular-nums text-right min-w-20">
            {formatAmount(line.total)}
          </div>
        </div>
      </div>
    </UniversalContextMenu>
  );
}
