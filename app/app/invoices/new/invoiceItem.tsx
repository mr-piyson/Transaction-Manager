import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trash2, Box } from 'lucide-react';
import { UniversalContextMenu } from '@/components/context-menu';
import { InvoiceLine } from '@prisma/client';
import { trpc } from '@/lib/trpc/client';
import { formatAmount } from '@/lib/utils';

export default function InvoiceItemCard({ line }: { line: InvoiceLine }) {
  const utils = trpc.useUtils();

  const itemRef = (line as any).itemRef;

  const handleUpdateQuantity = (newQty: number) => {};

  const handleDelete = () => {};

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
      <div className="outline flex flex-row justify-between items-center p-3 px-3 w-full bg-popover overflow-hidden hover:bg-muted/50 transition-colors group">
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
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>{formatAmount(line.unitPrice)}</span>
              <span className="text-muted-foreground/60">× {Number(line.quantity)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center bg-muted/30 rounded-md p-0.5 border border-border/50">
            <span className="w-6 text-center text-xs font-semibold tabular-nums">
              {Number(line.quantity)}
            </span>
          </div>

          <div className="text-sm font-semibold tabular-nums text-right min-w-15">
            {formatAmount(line.total)}
          </div>
        </div>
      </div>
    </UniversalContextMenu>
  );
}
