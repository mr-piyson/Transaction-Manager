'use client';

import { queryClient } from '@/components/QueryProvider';
import { Customer, Invoice } from '@prisma/client';
import { useMutation, UseMutationResult, useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface InvoiceWithCustomer extends Invoice {
  customer: Customer;
}

// Now Omit will respect those optional flags
type InvoiceInput = Omit<OptionalIfNullable<Invoice>, 'id' | 'createdAt' | 'updatedAt'>;

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
    create: (): UseMutationResult<Invoice, Error, InvoiceInput> =>
      useMutation({
        mutationFn: async (newCustomer) => {
          const { data } = await axios.post<Invoice>('/api/invoices', newCustomer);
          return data;
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey });
        },
      }),

    // --- UPDATE ---
    update: (): UseMutationResult<Invoice, Error, Partial<Invoice> & { id: string }> =>
      useMutation({
        mutationFn: async ({ id, ...updates }) => {
          const { data } = await axios.patch<Invoice>(`/api/invoices/${id}`, updates);
          return data;
        },
        onSuccess: (updatedCustomer) => {
          queryClient.invalidateQueries({ queryKey });
          queryClient.invalidateQueries({
            queryKey: [...queryKey, updatedCustomer.id],
          });
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
