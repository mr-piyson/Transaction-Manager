'use client';

import api from '@/lib/api';
import { Payment } from '@prisma/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InvoicesKeys } from './use-invoices';

const SCOPE = 'payments';
const BASE_URL = `/api/${SCOPE}`;

export const useCreatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation<Payment, Error, Partial<Payment>>({
    mutationFn: async (payload) => {
      const { data } = await api.post<Payment>(BASE_URL, payload);
      return data;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: InvoicesKeys.detail(String(created.invoiceId)) });
      queryClient.invalidateQueries({ queryKey: InvoicesKeys.lists() });
    },
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: number; invoiceId: number }>({
    mutationFn: async ({ id }) => {
      await api.delete(`${BASE_URL}/${id}`);
    },
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: InvoicesKeys.detail(String(invoiceId)) });
      queryClient.invalidateQueries({ queryKey: InvoicesKeys.lists() });
    },
  });
};
