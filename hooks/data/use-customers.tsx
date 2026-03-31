'use client';

import api from '@/lib/api';
import { Customer } from '@prisma/client';
import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

const SCOPE = 'customers';
const BASE_URL = `/api/${SCOPE}`;

// ---------------------------------------------------------------------------
// Key factory
// ---------------------------------------------------------------------------

export const CustomersKeys = {
  all: [SCOPE] as const,
  lists: () => [SCOPE, 'list'] as const,
  list: (filters?: object) => [SCOPE, 'list', { filters }] as const,
  details: () => [SCOPE, 'detail'] as const,
  detail: (id: string | undefined) => [SCOPE, 'detail', id] as const,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpdateCustomerPayload {
  id: string;
  data: Partial<Omit<Customer, 'id'>>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export const useCustomers = (
  options?: Omit<UseQueryOptions<Customer[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery<Customer[]>({
    queryKey: CustomersKeys.lists(),
    queryFn: async () => {
      const { data } = await api.get<Customer[]>(BASE_URL);
      return data;
    },
    ...options,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation<Customer, Error, OptionalIfNullable<Omit<Customer, 'id'>>>({
    mutationFn: async (payload) => {
      const { data } = await api.post<Customer>(BASE_URL, payload);
      return data;
    },
    onSuccess: (created) => {
      // Seed the detail cache so navigating to the new Customer skips the loading state
      queryClient.setQueryData<OptionalIfNullable<Customer>>(
        CustomersKeys.detail(String(created.id)),
        created,
      );
      queryClient.invalidateQueries({ queryKey: CustomersKeys.lists() });
    },
  });
};

export const useGetCustomer = (
  id: string | undefined,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn' | 'enabled'>,
) => {
  return useQuery({
    queryKey: CustomersKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get(`${BASE_URL}/${id}`);
      return data;
    },
    enabled: !!id,
    ...options,
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Customer,
    Error,
    UpdateCustomerPayload,
    { previousCustomer: Customer | undefined }
  >({
    mutationFn: async ({ id, data }) => {
      const { data: updated } = await api.patch<Customer>(`${BASE_URL}/${id}`, data);
      return updated;
    },

    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: CustomersKeys.detail(payload.id) });

      const previousCustomer = queryClient.getQueryData<Customer>(CustomersKeys.detail(payload.id));

      queryClient.setQueryData<Customer>(CustomersKeys.detail(payload.id), (old) => {
        if (!old) return old;
        return { ...old, ...payload.data };
      });

      return { previousCustomer };
    },

    onError: (_err, payload, context) => {
      if (context?.previousCustomer) {
        queryClient.setQueryData<Customer>(
          CustomersKeys.detail(payload.id),
          context.previousCustomer,
        );
      }
    },

    onSettled: (_data, _err, payload) => {
      queryClient.invalidateQueries({ queryKey: CustomersKeys.detail(payload.id) });
      queryClient.invalidateQueries({ queryKey: CustomersKeys.lists() });
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`${BASE_URL}/${id}`);
    },
    onSuccess: (_data, id) => {
      // Remove rather than invalidate — the entity no longer exists
      queryClient.removeQueries({ queryKey: CustomersKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: CustomersKeys.lists() });
    },
    onError: () => {
      // Refetch list so a silent server failure doesn't leave a ghost entry
      queryClient.invalidateQueries({ queryKey: CustomersKeys.lists() });
    },
  });
};
