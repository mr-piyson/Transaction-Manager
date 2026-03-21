import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useContracts = () => {
  return {
    getAll: () =>
      useQuery({
        queryKey: ['contracts'],
        queryFn: async () => (await axios.get('/api/contracts')).data,
      }),
    getById: (id?: string) =>
      useQuery({
        queryKey: ['contracts', id],
        queryFn: async () => (await axios.get(`/api/contracts/${id}`)).data,
        enabled: !!id,
      }),
  };
};
