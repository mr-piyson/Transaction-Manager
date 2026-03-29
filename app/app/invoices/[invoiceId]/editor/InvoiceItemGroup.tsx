import React from 'react';
import { Box, Package } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Format } from '@/lib/format';

interface InvoiceItemCardGroupProps {
  title: string;
  totalQty: number;
  children: React.ReactNode;
}

export default function InvoiceItemCardGroup({
  title,
  totalQty,
  children,
}: InvoiceItemCardGroupProps) {
  return (
    <div className="flex flex-col w-full outline  overflow-hidden bg-background pb-4 mb-1">
      {/* Group Header - Matches InvoiceItemCard style */}
      <div className="flex flex-row justify-between items-center p-3 px-3 w-full bg-muted/30 border-b">
        <div className="flex flex-row items-center gap-3">
          <Avatar className="h-10 w-10 rounded-lg after:border-0 border-0 shadow-sm">
            <AvatarFallback className="rounded-lg bg-primary/20 text-primary">
              <Package className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
              {title}
            </h3>
          </div>
        </div>

        <div className="flex flex-row items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase">
            <Button size="sm" className="h-8 gap-1.5 text-xs flex-1 sm:flex-none">
              <Box size={13} />
              Add Item
            </Button>
          </span>
          <p className="text-sm font-bold">{Format.currency(totalQty)}</p>
        </div>
      </div>

      {/* List of Children (The InvoiceItemCards) */}
      <div className="flex ps-4 flex-col divide-y divide-border/50">{children}</div>
    </div>
  );
}
