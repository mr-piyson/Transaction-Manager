'use client';

import { useRouter } from 'next/navigation';
import { User, Calendar, Hash, FileText } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Format } from '@/lib/format';

export function InvoiceCard({ data }: { data: any }) {
  const router = useRouter();

  if (!data) return null;

  const customerName = data.customer?.name ?? 'Walking Customer';
  const customerPhone = data.customer?.phone ?? 'No Phone';

  return (
    <div
      onClick={() => router.push(`/app/invoices/${data.id}`)}
      className="flex h-18 items-center gap-4 px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors border-b last:border-0"
    >
      {/* Customer Avatar */}
      <Avatar className="size-11 rounded-lg shrink-0 after:border-0">
        <AvatarFallback
          className={cn(
            'rounded-lg transition-colors bg-muted text-muted-foreground',
            data.paymentStatus === 'Paid'
              ? 'bg-success/20 text-success'
              : data.paymentStatus === 'Partial'
                ? 'bg-warning/20 text-warning '
                : 'bg-destructive/20 text-destructive',
          )}
        >
          <FileText className="size-5" />
        </AvatarFallback>
      </Avatar>

      {/* Invoice Details */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate text-sm sm:text-base">{Format.id.invoice(data.id)}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="size-3" />
            {customerName}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0 text-muted-foreground">
        <span>{Format.money.amount(data.total)}</span>
        {data.date && (
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {Format.date.relative(data.date)}
          </span>
        )}
      </div>
    </div>
  );
}
