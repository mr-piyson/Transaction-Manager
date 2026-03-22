import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, Tag, ArrowUpRight, ArrowDownLeft, Menu, Trash2, Edit } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Money } from '@/lib/money';
import { UniversalContextMenu } from '@/components/context-menu';

// Mock type based on your Prisma Model
interface InventoryItem {
  code?: string | null;
  name: string;
  description?: string | null;
  purchasePrice: number;
  salesPrice: number;
  image?: string | null;
  qty: number;
}

export default function InvoiceItemCard({ item }: { item: InventoryItem }) {
  // Convert cents/integers to currency format if needed

  const margin = item.salesPrice - item.purchasePrice;

  return (
    <UniversalContextMenu
      items={[
        {
          id: 'edit',
          label: 'Edit',
          icon: Edit,
        },
        {
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          destructive: true,
        },
      ]}
    >
      <div className="flex outline-border outline-1 flex-row justify-between items-center p-3 px-3 w-full bg-popover overflow-hidden hover:shadow-md">
        <div className="flex flex-row items-center gap-2">
          <Avatar className="border-0 h-10 w-10 rounded-lg  after:border-0">
            <AvatarImage className={'rounded-none!'} src={item.image || ''} alt={item.name} />
            <AvatarFallback className="rounded-lg bg-foreground/10 ">
              <Package className="h-5 w-5 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold leading-none tracking-tight">{item.name}</h3>
              {item.code && (
                <Badge variant="secondary" className="text-[10px] uppercase">
                  {item.code}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {item.description || 'No description provided'}
            </p>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">{Money.format(200)}</div>
          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{'Qty :' + (item.qty || 1)}</p>
        </div>
        {/* <div className="flex flex-col appearance-none max-sm:hidden"></div> */}
      </div>
    </UniversalContextMenu>
  );
}
