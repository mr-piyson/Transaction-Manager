'use client';
import { UniversalContextMenu } from '@/components/context-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { formatAmount, cn } from '@/lib/utils';
import { Box, EllipsisVertical, Trash2 } from 'lucide-react';

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

  const handleChange = (field: string, value: any) => {
    const updated = { ...line, [field]: value };
    updated.total = Number(updated.quantity) * Number(updated.unitPrice);
    onUpdate?.(updated);
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
      <div className="flex flex-row justify-between items-center p-3 px-3 w-full bg-background overflow-hidden hover:bg-muted/50 transition-colors group border-b last:border-0 border-border/50">
        <div className="flex flex-row items-center gap-3 flex-1 min-w-0">
          <Avatar className="border-0 h-10 w-10 rounded-lg shrink-0">
            <AvatarImage src={itemRef?.imageUrl || ''} alt={line.description || 'Item'} />
            <AvatarFallback className="rounded-lg bg-foreground/5">
              <Box className="h-5 w-5 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium leading-none truncate">{line.description}</h3>
              <Badge variant="outline" className="px-1 text-[9px] h-3.5 opacity-70">
                {itemRef?.type || 'ITEM'}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] opacity-60">QTY</span>
                <input
                  type="number"
                  value={line.quantity}
                  onChange={(e) => handleChange('quantity', Number(e.target.value))}
                  className="w-12 bg-muted/50 rounded border-none px-1 py-0.5 text-center focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] opacity-60">PRICE</span>
                <input
                  type="number"
                  value={line.unitPrice}
                  onChange={(e) => handleChange('unitPrice', Number(e.target.value))}
                  className="w-20 bg-muted/50 rounded border-none px-1 py-0.5 text-left focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              {itemRef?.type === 'PRODUCT' && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] bg-muted/50 font-medium whitespace-nowrap',
                    (itemRef?.stockEntries?.reduce((acc: any, s: any) => acc + s.quantity, 0) ||
                      0) < Number(line.quantity)
                      ? 'text-destructive bg-destructive/10'
                      : 'text-muted-foreground',
                  )}
                >
                  STK:{' '}
                  {itemRef?.stockEntries?.reduce((acc: any, s: any) => acc + s.quantity, 0) || 0}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 pl-4">
          <div className="text-sm font-bold tabular-nums text-right min-w-[80px]">
            {formatAmount(line.total)}
          </div>
        </div>
      </div>
    </UniversalContextMenu>
  );
}
