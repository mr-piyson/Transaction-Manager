import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useCustomers = () => {
  return {
    getAll: () =>
      useQuery({
        queryKey: ['customers'],
        queryFn: async () => (await axios.get('/api/customers')).data,
      }),
    getById: (id?: string) =>
      useQuery({
        queryKey: ['customers', id],
        queryFn: async () => (await axios.get(`/api/customers/${id}`)).data,
        enabled: !!id,
      }),
  };
};
