'use client';

import { Receipt } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function InvoicesPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center">
        <Receipt className="size-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Invoices</h2>
        <p className="text-muted-foreground mt-1">Select an invoice from the list or create a new one.</p>
      </div>
      <Button onClick={() => router.push('/app/invoices/new')}>
        New Invoice
      </Button>
    </div>
  );
}
