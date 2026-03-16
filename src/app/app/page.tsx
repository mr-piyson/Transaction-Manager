'use client';

import { Customer } from '@prisma/client';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { InvoiceEditor } from '@/components/invoice/invoice-editor';

export default function App_Page(props: any) {
  const {
    data: customers,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await axios.get<Customer[]>('/api/customers')).data,
  });

  return (
    <div className="p-4 space-y-4">
      <InvoiceEditor />
    </div>
  );
}
