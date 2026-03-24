'use client';

import { InvoiceWithDetails } from '@/app/api/invoices/[id]/route';
import api from '@/lib/api';
import { Invoice } from '@prisma/client';
import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

const SCOPE = 'invoices';
const BASE_URL = `/api/${SCOPE}`;

// ---------------------------------------------------------------------------
// Key factory
// ---------------------------------------------------------------------------

export const InvoicesKeys = {
  all: [SCOPE] as const,
  lists: () => [SCOPE, 'list'] as const,
  list: (filters?: object) => [SCOPE, 'list', { filters }] as const,
  details: () => [SCOPE, 'detail'] as const,
  detail: (id: string | undefined) => [SCOPE, 'detail', id] as const,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpdateInvoicePayload {
  id: string;
  data: Partial<Omit<Invoice, 'id'>>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export const useInvoices = (options?: Omit<UseQueryOptions<Invoice[]>, 'queryKey' | 'queryFn'>) => {
  return useQuery<Invoice[]>({
    queryKey: InvoicesKeys.lists(),
    queryFn: async () => {
      const { data } = await api.get<Invoice[]>(BASE_URL);
      return data;
    },
    ...options,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation<Invoice, Error, Omit<OptionalIfNullable<Invoice>, 'id'>>({
    mutationFn: async (payload) => {
      const { data } = await api.post<Invoice>(BASE_URL, payload);
      return data;
    },
    onSuccess: (created) => {
      // Seed the detail cache so navigating to the new Invoice skips the loading state
      queryClient.setQueryData<Invoice>(InvoicesKeys.detail(String(created.id)), created);
      queryClient.invalidateQueries({ queryKey: InvoicesKeys.lists() });
    },
  });
};

export const useGetInvoiceWithDetails = (
  id: string | undefined,
  options?: Omit<UseQueryOptions<Invoice>, 'queryKey' | 'queryFn' | 'enabled'>,
) => {
  return useQuery<Invoice>({
    queryKey: InvoicesKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<InvoiceWithDetails>(`${BASE_URL}/${id}`);
      return data;
    },
    enabled: !!id,
    ...options,
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Invoice,
    Error,
    UpdateInvoicePayload,
    { previousInvoice: Invoice | undefined }
  >({
    mutationFn: async ({ id, data }) => {
      const { data: updated } = await api.patch<Invoice>(`${BASE_URL}/${id}`, data);
      return updated;
    },

    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: InvoicesKeys.detail(payload.id) });

      const previousInvoice = queryClient.getQueryData<Invoice>(InvoicesKeys.detail(payload.id));

      queryClient.setQueryData<Invoice>(InvoicesKeys.detail(payload.id), (old) => {
        if (!old) return old;
        return { ...old, ...payload.data };
      });

      return { previousInvoice };
    },

    onError: (_err, payload, context) => {
      if (context?.previousInvoice) {
        queryClient.setQueryData<Invoice>(InvoicesKeys.detail(payload.id), context.previousInvoice);
      }
    },

    onSettled: (_data, _err, payload) => {
      queryClient.invalidateQueries({ queryKey: InvoicesKeys.detail(payload.id) });
      queryClient.invalidateQueries({ queryKey: InvoicesKeys.lists() });
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`${BASE_URL}/${id}`);
    },
    onSuccess: (_data, id) => {
      // Remove rather than invalidate — the entity no longer exists
      queryClient.removeQueries({ queryKey: InvoicesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: InvoicesKeys.lists() });
    },
    onError: () => {
      // Refetch list so a silent server failure doesn't leave a ghost entry
      queryClient.invalidateQueries({ queryKey: InvoicesKeys.lists() });
    },
  });
};
