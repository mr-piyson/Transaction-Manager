'use client';

import api from '@/lib/api';
import { InventoryItem } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';

export const getAllInventoryItems = () =>
  useQuery<InventoryItem[]>({
    queryKey: ['Inventory'],
    queryFn: async () => (await api.get('/api/inventory')).data,
  });

/**
 * Get Inventory Item by ID
 */
export const getInventoryItemById = (id: string) =>
  useQuery<InventoryItem>({
    queryKey: ['Inventory', id],
    queryFn: async () => (await api.get(`/api/inventory/${id}`)).data,
    enabled: !!id,
  });
