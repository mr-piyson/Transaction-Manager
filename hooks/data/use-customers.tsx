import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import axios from 'axios';
import { Customer } from '@prisma/client';
import { queryClient } from '@/app/app/layout';

// We define a type for creating a customer (usually excludes the ID and timestamps)
type CustomerInput = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>;

export const useCustomers = () => {
  const queryKey = ['customers'];

  return {
    // --- READ ALL ---
    getAll: (): UseQueryResult<Customer[], Error> =>
      useQuery({
        queryKey,
        queryFn: async () => {
          const { data } = await axios.get<Customer[]>('/api/customers');
          return data;
        },
      }),

    // --- READ ONE ---
    getById: (id?: string): UseQueryResult<Customer, Error> =>
      useQuery({
        queryKey: [...queryKey, id],
        queryFn: async () => {
          const { data } = await axios.get<Customer>(`/api/customers/${id}`);
          return data;
        },
        enabled: !!id,
      }),

    // --- CREATE ---
    create: (): UseMutationResult<Customer, Error, CustomerInput> =>
      useMutation({
        mutationFn: async (newCustomer) => {
          const { data } = await axios.post<Customer>(
            '/api/customers',
            newCustomer,
          );
          return data;
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey });
        },
      }),

    // --- UPDATE ---
    // We use Partial<Customer> so you can send only the fields that changed
    update: (): UseMutationResult<
      Customer,
      Error,
      Partial<Customer> & { id: string }
    > =>
      useMutation({
        mutationFn: async ({ id, ...updates }) => {
          const { data } = await axios.patch<Customer>(
            `/api/customers/${id}`,
            updates,
          );
          return data;
        },
        onSuccess: (updatedCustomer) => {
          queryClient.invalidateQueries({ queryKey });
          queryClient.invalidateQueries({
            queryKey: [...queryKey, updatedCustomer.id],
          });
        },
      }),

    // Rename 'delete' to 'remove' here once
    remove: (): UseMutationResult<void, Error, string> =>
      useMutation({
        mutationFn: async (id) => {
          await axios.delete(`/api/customers/${id}`);
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey });
        },
      }),
  };
};
