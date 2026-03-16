'use client';

import { useRouter } from 'next/navigation';
import { User, Calendar, Hash, FileSpreadsheet, FileText } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Aligning with your Prisma Schema
export type InvoiceWithRelations = {
  id: number;
  date: string | Date;
  description?: string | null;
  customerId?: number | null;
  customer?: {
    name: string;
    phone: string;
    address: string;
  } | null;
};

export function InvoiceCardRenderer({ data }: { data: InvoiceWithRelations }) {
  const router = useRouter();

  if (!data) return null;

  const customerName = data.customer?.name ?? 'Walking Customer';
  const customerPhone = data.customer?.phone ?? 'No Phone';

  return (
    <div onClick={() => router.push(`/app/invoices/${data.id}`)} className="flex items-center gap-4 px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors border-b last:border-0">
      {/* Customer Avatar */}
      <Avatar className="size-10 shrink-0 border bg-background">
        <AvatarFallback className="text-muted-foreground">
          <FileText className="size-5" />
        </AvatarFallback>
      </Avatar>

      {/* Customer & Invoice Details */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate text-sm sm:text-base">{customerName}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Hash className="size-3" />
            INV-{data.id.toString().padStart(4, '0')}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0 text-muted-foreground">
        <span>Total : 12.000 DB</span>
        <span className="flex items-center gap-1">
          <Calendar className="size-3" />
          {new Date(data.date).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
