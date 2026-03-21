import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Customer } from '@prisma/client';
import { User2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CustomerCard(props: { itemList?: boolean; data: Customer }) {
  const router = useRouter();

  return (
    <div className={cn(props.itemList ?? 'hover:bg-accent/50 cursor-pointer', 'flex items-center gap-3 p-3  transition-colors ')} {...props}>
      <Avatar className="size-10">
        <AvatarImage
          // src={data.image ?? ""}
          alt={props.data.name || 'image'}
          loading="lazy"
          style={{ transition: 'opacity 0.2s' }}
        />
        <AvatarFallback>
          <User2 className="size-6" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{props.data.name}</p>
        <p className="text-sm text-muted-foreground truncate">{props.data.phone}</p>
      </div>
      <div className="text-right text-xs space-y-0.5">
        <p className="flex items-center justify-end gap-1 text-primary">
          <svg className="w-3 h-3" />
          <span className="font-semibold">{props.data.id}</span>
        </p>
        <p className="flex items-center justify-end gap-1 text-muted-foreground">
          <svg className="w-3 h-3" />
        </p>
      </div>
    </div>
  );
}
