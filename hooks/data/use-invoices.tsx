import { Customer, Invoice } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface InvoiceWithCustomer extends Invoice {
  customer: Customer;
}

export const useInvoices = () => {
  return {
    getAll: () =>
      useQuery<InvoiceWithCustomer[]>({
        queryKey: ['invoices'],
        queryFn: async () => (await axios.get('/api/invoices')).data,
      }),
    getById: (id?: string) =>
      useQuery<Invoice>({
        queryKey: ['invoices', id],
        queryFn: async () => (await axios.get(`/api/invoices/${id}`)).data,
        enabled: !!id,
      }),
  };
};
