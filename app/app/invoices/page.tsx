'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { FilePenLine, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/app/App-Header';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';

type InvoiceRow = {
  id: string;
  serial: string;
  type: string;
  status: string;
  paymentStatus: string;
  date: Date;
  dueDate?: Date | null;
  total: bigint;
  amountDue: bigint;
  customer?: { id: string; name: string } | null;
};

export default function InvoicesPage() {
  const router = useRouter();
  const { data = [], isLoading } = trpc.invoices.list.useQuery({});

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Invoices"
        icon={<FilePenLine className="size-5" />}
        rightContent={
          <Button size="sm" className="gap-1.5" onClick={() => router.push('/app/invoices/new')}>
            <Plus className="size-4" />
            New Invoice
          </Button>
        }
      />
    </div>
  );
}
