import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, Trash2, Edit, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Money } from '@/lib/money';
import { UniversalContextMenu } from '@/components/context-menu';
import { InvoiceLine } from '@prisma/client';
import { useDeleteInvoiceLine, useUpdateInvoiceLine } from '@/hooks/data/use-invoiceLines';
import { toast } from 'sonner';

export default function InvoiceItemCard({ line }: { line: InvoiceLine }) {
  const { mutate: updateLine } = useUpdateInvoiceLine();
  const { mutate: deleteLine } = useDeleteInvoiceLine();

  const itemRef = (line as any).itemRef;

  const handleUpdateQuantity = (newQty: number) => {
    if (newQty < 1) return;
    updateLine({
      id: line.id,
      data: {
        quantity: newQty,
        total: line.salesPrice * newQty,
      },
    });
  };

  const handleDelete = () => {
    if (!line.invoiceId) return;
    deleteLine(
      { id: line.id, invoiceId: line.invoiceId },
      {
        onSuccess: () => toast.success('Item removed'),
        onError: (err) => toast.error('Failed to remove item: ' + err.message),
      },
    );
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
      <div className="flex flex-row justify-between items-center p-3 px-3 w-full bg-popover overflow-hidden hover:bg-muted/50 transition-colors group">
        <div className="flex flex-row items-center gap-3">
          <Avatar className="border-0 h-10 w-10 rounded-lg shrink-0">
            <AvatarImage src={itemRef?.imageUrl || ''} alt={line.description || 'Item'} />
            <AvatarFallback className="rounded-lg bg-foreground/5">
              <Package className="h-5 w-5 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium leading-none truncate">{line.description}</h3>
              {itemRef?.code && (
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase h-4 px-1 leading-none text-muted-foreground border-muted-foreground/30"
                >
                  {itemRef.code}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>{Money.format(line.salesPrice)}</span>
              {line.quantity > 1 && (
                <span className="text-muted-foreground/60">× {line.quantity}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center bg-muted/30 rounded-md p-0.5 border border-border/50">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => handleUpdateQuantity(line.quantity - 1)}
              disabled={line.quantity <= 1}
            >
              <Minus size={12} />
            </Button>
            <span className="w-6 text-center text-xs font-semibold tabular-nums">
              {line.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => handleUpdateQuantity(line.quantity + 1)}
            >
              <Plus size={12} />
            </Button>
          </div>

          <div className="text-sm font-semibold tabular-nums text-right min-w-[60px]">
            {Money.format(line.total)}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 max-sm:hidden text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
            onClick={handleDelete}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </UniversalContextMenu>
  );
}
