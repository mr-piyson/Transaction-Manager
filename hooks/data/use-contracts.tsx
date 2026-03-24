'use client';

import api from '@/lib/api';
import { Contract } from '@prisma/client';
import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

const SCOPE = 'contracts';
const BASE_URL = `/api/${SCOPE}`;

// ---------------------------------------------------------------------------
// Key factory
// ---------------------------------------------------------------------------

export const ContractsKeys = {
  all: [SCOPE] as const,
  lists: () => [SCOPE, 'list'] as const,
  list: (filters?: object) => [SCOPE, 'list', { filters }] as const,
  details: () => [SCOPE, 'detail'] as const,
  detail: (id: string | undefined) => [SCOPE, 'detail', id] as const,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpdateContractPayload {
  id: string;
  data: Partial<Omit<Contract, 'id'>>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export const useContracts = (
  options?: Omit<UseQueryOptions<Contract[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery<Contract[]>({
    queryKey: ContractsKeys.lists(),
    queryFn: async () => {
      const { data } = await api.get<Contract[]>(BASE_URL);
      return data;
    },
    ...options,
  });
};

export const useCreateContract = () => {
  const queryClient = useQueryClient();

  return useMutation<Contract, Error, OptionalIfNullable<Omit<Contract, 'id'>>>({
    mutationFn: async (payload) => {
      const { data } = await api.post<Contract>(BASE_URL, payload);
      return data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<Contract>(ContractsKeys.detail(created.id), created);
      queryClient.invalidateQueries({ queryKey: ContractsKeys.lists() });
    },
  });
};

export const useGetContract = (
  id: string | undefined,
  options?: Omit<UseQueryOptions<Contract>, 'queryKey' | 'queryFn' | 'enabled'>,
) => {
  return useQuery<Contract>({
    queryKey: ContractsKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Contract>(`${BASE_URL}/${id}`);
      return data;
    },
    enabled: !!id,
    ...options,
  });
};

export const useUpdateContract = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Contract,
    Error,
    UpdateContractPayload,
    { previousContract: Contract | undefined }
  >({
    mutationFn: async ({ id, data }) => {
      const { data: updated } = await api.patch<Contract>(`${BASE_URL}/${id}`, data);
      return updated;
    },

    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ContractsKeys.detail(payload.id) });

      const previousContract = queryClient.getQueryData<Contract>(ContractsKeys.detail(payload.id));

      // ✅ Typed — no `any`, updater receives `Contract | undefined`
      queryClient.setQueryData<Contract>(ContractsKeys.detail(payload.id), (old) => {
        if (!old) return old;
        return { ...old, ...payload.data };
      });

      return { previousContract };
    },

    onError: (_err, payload, context) => {
      if (context?.previousContract) {
        queryClient.setQueryData<Contract>(
          ContractsKeys.detail(payload.id),
          context.previousContract,
        );
      }
    },

    onSettled: (_data, _err, payload) => {
      queryClient.invalidateQueries({ queryKey: ContractsKeys.detail(payload.id) });
      queryClient.invalidateQueries({ queryKey: ContractsKeys.lists() });
    },
  });
};

export const useDeleteContract = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`${BASE_URL}/${id}`);
    },
    onSuccess: (_data, id) => {
      // Remove rather than invalidate — the entity no longer exists
      queryClient.removeQueries({ queryKey: ContractsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ContractsKeys.lists() });
    },
    onError: () => {
      // Refetch list so a silent server failure doesn't leave a ghost entry
      queryClient.invalidateQueries({ queryKey: ContractsKeys.lists() });
    },
  });
};
