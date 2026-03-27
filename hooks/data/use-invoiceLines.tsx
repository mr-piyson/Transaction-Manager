'use client';

import api from '@/lib/api';
import { InvoiceLine } from '@prisma/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InvoicesKeys } from './use-invoices';

const SCOPE = 'invoice-lines';
const BASE_URL = `/api/${SCOPE}`;

export const useCreateInvoiceLine = () => {
  const queryClient = useQueryClient();

  return useMutation<
    InvoiceLine,
    Error,
    { invoiceId: number; inventoryItemId: number; quantity?: number }
  >({
    mutationFn: async (payload) => {
      const { data } = await api.post<InvoiceLine>(BASE_URL, payload);
      return data;
    },
    onSuccess: (created) => {
      if (created.invoiceId) {
        queryClient.invalidateQueries({ queryKey: InvoicesKeys.detail(String(created.invoiceId)) });
      }
    },
  });
};

export const useUpdateInvoiceLine = () => {
  const queryClient = useQueryClient();

  return useMutation<InvoiceLine, Error, { id: number; data: Partial<InvoiceLine> }>({
    mutationFn: async ({ id, data }) => {
      const { data: updated } = await api.patch<InvoiceLine>(`${BASE_URL}/${id}`, data);
      return updated;
    },
    onSuccess: (updated) => {
      if (updated.invoiceId) {
        queryClient.invalidateQueries({ queryKey: InvoicesKeys.detail(String(updated.invoiceId)) });
      }
    },
  });
};

export const useDeleteInvoiceLine = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: number; invoiceId: number }>({
    mutationFn: async ({ id }) => {
      await api.delete(`${BASE_URL}/${id}`);
    },
    onSuccess: (_data, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: InvoicesKeys.detail(String(invoiceId)) });
    },
  });
};
