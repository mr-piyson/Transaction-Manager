import React from 'react';
import { Package } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface InvoiceItemCardGroupProps {
  title: string;
  totalQty: number;
  children: React.ReactNode;
}

export default function InvoiceItemCardGroup({ title, totalQty, children }: InvoiceItemCardGroupProps) {
  return (
    <div className="flex flex-col w-full border  overflow-hidden bg-background pb-8 mb-1">
      {/* Group Header - Matches InvoiceItemCard style */}
      <div className="flex flex-row justify-between items-center p-3 px-4 w-full bg-muted/30 border-b">
        <div className="flex flex-row items-center gap-3">
          <Avatar className="h-10 w-10 rounded-lg after:border-0 border-0 shadow-sm">
            <AvatarFallback className="rounded-lg bg-primary/20 text-primary">
              <Package className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">{title}</h3>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-xs font-medium text-muted-foreground uppercase">Total Items</span>
          <p className="text-sm font-bold">{totalQty}</p>
        </div>
      </div>

      {/* List of Children (The InvoiceItemCards) */}
      <div className="flex ps-8 flex-col divide-y divide-border/50">{children}</div>
    </div>
  );
}
