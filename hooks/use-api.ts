// @/lib/client.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

/**
 * Standard Omit for Prisma metadata, then apply the Nullable logic
 */
type BaseInput<T> = OptionalIfNullable<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

type ApiRoute = `/api/${string}`;

export function createApiHooks<T>(endpoint: ApiRoute, Key: string) {
  const base = {
    // 1. Fetch All
    useGetAll: () =>
      useQuery<T[]>({
        queryKey: [Key],
        queryFn: async () => (await axios.get(endpoint)).data,
      }),

    // 2. Fetch One
    useGetById: (id?: string) =>
      useQuery<T>({
        queryKey: [Key, id],
        queryFn: async () => (await axios.get(`${endpoint}/${id}`)).data,
        enabled: !!id,
      }),

    // 3. Create (Utilizing OptionalIfNullable)
    useCreate: () => {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: async (newData: BaseInput<T>) => (await axios.post(endpoint, newData)).data,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [Key] }),
      });
    },

    // 4. Update (Utilizing Partial + OptionalIfNullable)
    useUpdate: () => {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<BaseInput<T>> & { id: string }) =>
          (await axios.patch(`${endpoint}/${id}`, updates)).data,
        onSuccess: (data: any) => {
          queryClient.invalidateQueries({ queryKey: [Key] });
          queryClient.invalidateQueries({ queryKey: [Key, data.id] });
        },
      });
    },

    // 5. Remove
    useRemove: () => {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: async (id: string) => axios.delete(`${endpoint}/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [Key] }),
      });
    },
  };

  return {
    ...base,
    // This helper allows for "Chaining" while preserving Types
    extend: <TEx extends Record<string, any>>(extensionFn: (baseHooks: typeof base) => TEx) => {
      const extensions = extensionFn(base);
      return {
        ...base,
        ...extensions,
      };
    },
  };
}
