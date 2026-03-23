'use client';

import { InventoryItem } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useInventoryItems = (id?: string) => {
  /**
   * Get All inventory Items
   */
  const getAll = useQuery<InventoryItem[]>({
    queryKey: ['Inventory'],
    queryFn: async () => (await axios.get('/api/inventory')).data,
  });

  /**
   * Get Inventory Item by ID
   */
  const getById = useQuery<InventoryItem>({
    queryKey: ['Inventory', id],
    queryFn: async () => (await axios.get(`/api/inventory/${id}`)).data,
    enabled: !!id,
  });

  return {
    getAll,
    getById,
  };
};
