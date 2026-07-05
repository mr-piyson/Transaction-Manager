import { Box, FileText, Package, Wrench } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ItemListItemProps extends HTMLAttributes<HTMLDivElement> {
  data?: any;
}

const TYPE_STYLES: Record<string, { icon: typeof Package; bg: string; fg: string }> = {
  PRODUCT: {
    icon: Box,
    bg: 'bg-sky-100 dark:bg-sky-900/40',
    fg: 'text-sky-700 dark:text-sky-300',
  },
  SERVICE: {
    icon: Wrench,
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    fg: 'text-orange-700 dark:text-orange-300',
  },
};

export function ItemListItem({ data, className, ...props }: ItemListItemProps) {
  const { name, sku, type, image } = data || {};
  const style = TYPE_STYLES[type as string] ?? TYPE_STYLES.PRODUCT;
  const Icon = style.icon;

  return (
    <div className={cn('flex h-18 items-center gap-3 p-3', className)} {...props}>
      <div
        className={cn(
          'size-11 rounded-lg flex items-center justify-center shrink-0 overflow-hidden',
          style.bg,
        )}
      >
        {image ? (
          <img src={image} alt={name} className="size-full object-cover" />
        ) : (
          <Icon className={cn('size-5', style.fg)} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold truncate">{name}</p>
          <Badge variant="outline" className="text-xs">
            <Icon className={cn('size-5', style.fg)} />

            {type}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">{sku ?? '—'}</p>
      </div>
    </div>
  );
}
