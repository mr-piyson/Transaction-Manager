'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Customer } from '@prisma/client';

type CustomerInput = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>;
const CACHE_KEY = ['customers'];

export const useCustomers = () => {
  const queryClient = useQueryClient();

  return {
    // 1. Fetch All
    useGetAll: () =>
      useQuery<Customer[]>({
        queryKey: CACHE_KEY,
        queryFn: async () => (await axios.get('/api/customers')).data,
      }),

    // 2. Fetch One
    useGetById: (id?: string) =>
      useQuery<Customer>({
        queryKey: [...CACHE_KEY, id],
        queryFn: async () => (await axios.get(`/api/customers/${id}`)).data,
        enabled: !!id,
      }),

    // 3. Create
    useCreate: () =>
      useMutation({
        mutationFn: async (newCustomer: CustomerInput) =>
          (await axios.post('/api/customers', newCustomer)).data,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: CACHE_KEY }),
      }),

    // 4. Update
    useUpdate: () =>
      useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Customer> & { id: string }) =>
          (await axios.patch(`/api/customers/${id}`, updates)).data,
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: CACHE_KEY });
          queryClient.invalidateQueries({ queryKey: [...CACHE_KEY, data.id] });
        },
      }),

    // 5. Remove
    useRemove: () =>
      useMutation({
        mutationFn: async (id: string) => axios.delete(`/api/customers/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: CACHE_KEY }),
      }),
  };
};
