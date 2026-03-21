import { queryClient } from '@/src/app/app/layout';
import { Customer, Invoice } from '@prisma/client';
import { useMutation, UseMutationResult, useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface InvoiceWithCustomer extends Invoice {
  customer: Customer;
}

// We define a type for creating a customer (usually excludes the ID and timestamps)
type InvoiceInput = Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>;

export const useInvoices = () => {
  const queryKey = ['invoices'];
  return {
    getAll: () =>
      useQuery<InvoiceWithCustomer[]>({
        queryKey,
        queryFn: async () => (await axios.get('/api/invoices')).data,
      }),
    getById: (id?: string) =>
      useQuery<Invoice>({
        queryKey: [...queryKey, id],
        queryFn: async () => (await axios.get(`/api/invoices/${id}`)).data,
        enabled: !!id,
      }),
    // --- CREATE ---
    create: (): UseMutationResult<Customer, Error, InvoiceInput> =>
      useMutation({
        mutationFn: async (newCustomer) => {
          const { data } = await axios.post<Customer>('/api/invoices', newCustomer);
          return data;
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey });
        },
      }),

    // --- UPDATE ---
    // We use Partial<Customer> so you can send only the fields that changed
    update: (): UseMutationResult<Customer, Error, Partial<Customer> & { id: string }> =>
      useMutation({
        mutationFn: async ({ id, ...updates }) => {
          const { data } = await axios.patch<Customer>(`/api/invoices/${id}`, updates);
          return data;
        },
        onSuccess: (updatedCustomer) => {
          queryClient.invalidateQueries({ queryKey });
          queryClient.invalidateQueries({ queryKey: [...queryKey, updatedCustomer.id] });
        },
      }),

    // --- DELETE ---
    delete: (): UseMutationResult<void, Error, string> =>
      useMutation({
        mutationFn: async (id) => {
          await axios.delete(`/api/invoices/${id}`);
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey });
        },
      }),
  };
};
