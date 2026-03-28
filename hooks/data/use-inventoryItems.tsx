'use client';

import api from '@/lib/api';
import { InventoryItem } from '@prisma/client';
import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';

const SCOPE = 'inventory';
const BASE_URL = `/api/${SCOPE}`;

// ---------------------------------------------------------------------------
// Key factory
// ---------------------------------------------------------------------------

export const InventoryItemsKeys = {
  all: [SCOPE] as const,
  lists: () => [SCOPE, 'list'] as const,
  list: (filters?: object) => [SCOPE, 'list', { filters }] as const,
  details: () => [SCOPE, 'detail'] as const,
  detail: (id: string | undefined) => [SCOPE, 'detail', id] as const,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpdateInventoryItemPayload {
  id: string;
  data: Partial<Omit<InventoryItem, 'id'>>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export const useInventoryItems = (
  options?: Omit<UseQueryOptions<InventoryItem[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery<InventoryItem[]>({
    queryKey: InventoryItemsKeys.lists(),
    queryFn: async () => {
      const { data } = await api.get<InventoryItem[]>(BASE_URL);
      return data;
    },
    ...options,
  });
};

export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation<InventoryItem, Error, OptionalIfNullable<Omit<InventoryItem, 'id'>>>({
    mutationFn: async (payload) => {
      const formData = new FormData();

      // Standard fields
      formData.append('name', payload.name);
      formData.append('code', payload?.code || '');
      formData.append('purchasePrice', String(payload.purchasePrice || 0));
      formData.append('salesPrice', String(payload.salesPrice || 0));
      formData.append('description', payload.description || '');

      // File field - ensure payload.image is a File object
      if (payload.image) {
        formData.append('image', payload.image);
      }
      const { data } = await api.post<InventoryItem>(BASE_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data;
    },
    onSuccess: (created) => {
      // Seed the detail cache so navigating to the new InventoryItem skips the loading state
      queryClient.setQueryData<InventoryItem>(
        InventoryItemsKeys.detail(String(created.id)),
        created,
      );
      queryClient.invalidateQueries({ queryKey: InventoryItemsKeys.lists() });
    },
  });
};

export const useGetInventoryItem = (
  id: string | undefined,
  options?: Omit<UseQueryOptions<InventoryItem>, 'queryKey' | 'queryFn' | 'enabled'>,
) => {
  return useQuery<InventoryItem>({
    queryKey: InventoryItemsKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<InventoryItem>(`${BASE_URL}/${id}`);
      return data;
    },
    enabled: !!id,
    ...options,
  });
};

export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    InventoryItem,
    Error,
    UpdateInventoryItemPayload,
    { previousInventoryItem: InventoryItem | undefined }
  >({
    mutationFn: async ({ id, data }) => {
      const { data: updated } = await api.patch<InventoryItem>(`${BASE_URL}/${id}`, data);
      return updated;
    },

    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: InventoryItemsKeys.detail(payload.id) });

      const previousInventoryItem = queryClient.getQueryData<InventoryItem>(
        InventoryItemsKeys.detail(payload.id),
      );

      queryClient.setQueryData<InventoryItem>(InventoryItemsKeys.detail(payload.id), (old) => {
        if (!old) return old;
        return { ...old, ...payload.data };
      });

      return { previousInventoryItem };
    },

    onError: (_err, payload, context) => {
      if (context?.previousInventoryItem) {
        queryClient.setQueryData<InventoryItem>(
          InventoryItemsKeys.detail(payload.id),
          context.previousInventoryItem,
        );
      }
    },

    onSettled: (_data, _err, payload) => {
      queryClient.invalidateQueries({ queryKey: InventoryItemsKeys.detail(payload.id) });
      queryClient.invalidateQueries({ queryKey: InventoryItemsKeys.lists() });
    },
  });
};

export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`${BASE_URL}/${id}`);
    },
    onSuccess: (_data, id) => {
      // Remove rather than invalidate — the entity no longer exists
      queryClient.removeQueries({ queryKey: InventoryItemsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: InventoryItemsKeys.lists() });
    },
    onError: () => {
      // Refetch list so a silent server failure doesn't leave a ghost entry
      queryClient.invalidateQueries({ queryKey: InventoryItemsKeys.lists() });
    },
  });
};
