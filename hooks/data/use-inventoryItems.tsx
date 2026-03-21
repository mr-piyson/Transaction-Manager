import { InventoryItem, Invoice } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useInventoryItems = () => {
  return {
    getAll: () =>
      useQuery<InventoryItem[]>({
        queryKey: ['Inventory'],
        queryFn: async () => (await axios.get('/api/inventory')).data,
      }),
    getById: (id?: string) =>
      useQuery<InventoryItem>({
        queryKey: ['Inventory', id],
        queryFn: async () => (await axios.get(`/api/inventory/${id}`)).data,
        enabled: !!id,
      }),
  };
};
