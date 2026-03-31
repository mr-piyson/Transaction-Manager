'use client';

import api from '@/lib/api';
import { Invoice, Prisma } from '@prisma/client';
import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

const SCOPE = 'invoices';
const BASE_URL = `/api/${SCOPE}`;

// ---------------------------------------------------------------------------
// Key factory
// ---------------------------------------------------------------------------

export const InvoicesKeys = {
  all: [SCOPE] as const,

  lists: () => [SCOPE, 'list'] as const,

  list: (filters?: object) =>
    filters ? ([SCOPE, 'list', { filters }] as const) : ([SCOPE, 'list'] as const),

  details: () => [SCOPE, 'detail'] as const,

  detail: <TInclude extends Prisma.InvoiceInclude>(id: string | undefined, include?: TInclude) =>
    include ? ([SCOPE, 'detail', id, { include }] as const) : ([SCOPE, 'detail', id] as const),
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

export interface UseInvoicesOptions extends Omit<
  UseQueryOptions<Invoice[]>,
  'queryKey' | 'queryFn'
> {
  include?: {
    customer?: boolean;
    invoiceLines?: boolean;
    payments?: boolean;
  };
}

export const useInvoices = (options?: UseInvoicesOptions) => {
  return useQuery<Invoice[]>({
    queryKey: InvoicesKeys.lists(),
    queryFn: async () => {
      const { data } = await api.get<Invoice[]>(BASE_URL, {
        params: options?.include,
      });
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

type InvoicePayload<TInclude extends Prisma.InvoiceInclude> = Prisma.InvoiceGetPayload<{
  include: TInclude;
}>;

export const useGetInvoice = <TInclude extends Prisma.InvoiceInclude>(
  id: string | undefined,
  include?: TInclude,
  options?: Omit<UseQueryOptions<InvoicePayload<TInclude>>, 'queryKey' | 'queryFn' | 'enabled'>,
) => {
  return useQuery<InvoicePayload<TInclude>>({
    queryKey: InvoicesKeys.detail(id, include),
    queryFn: async () => {
      const { data } = await api.get<InvoicePayload<TInclude>>(`${BASE_URL}/${id}`, {
        params: {
          include: JSON.stringify(include),
        },
      });
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
      queryClient.invalidateQueries({
        queryKey: InvoicesKeys.detail(payload.id),
      });

      queryClient.invalidateQueries({
        queryKey: InvoicesKeys.lists(),
      });
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
