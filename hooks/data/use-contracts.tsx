'use client';

import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export const useContracts = () => {
  return {
    getAll: () =>
      useQuery({
        queryKey: ['contracts'],
        queryFn: async () => (await api.get('/api/contracts')).data,
      }),
    getById: (id?: string) =>
      useQuery({
        queryKey: ['contracts', id],
        queryFn: async () => (await api.get(`/api/contracts/${id}`)).data,
        enabled: !!id,
      }),
  };
};
