// lib/api.ts
'use client';

import axios from 'axios';
import { useAPI } from '@/hooks/use-api';
import { Contract, Customer, InventoryItem, Invoice, Organization, User } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';

const api = axios.create({
  // Use an environment variable for the base URL.
  // In Next.js, "NEXT_PUBLIC_" prefix makes it available to the browser.
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;

export const usersApi = useAPI<User>('/users', 'users');
export const invoicesAPI = useAPI<Invoice>('/invoices', 'invoices');
export const customersApi = useAPI<Customer>('/customers', 'customers');
export const contractsApi = useAPI<Contract>('/contracts', 'contracts');
export const itemsAPI = useAPI<InventoryItem>('/inventoryItems', 'inventoryItems');
export const organizationsAPI = useAPI<Organization>('/organizations', 'organizations').extend(
  (base) => ({
    useCheckOrganization: () =>
      useQuery<{ hasOrganization: boolean }>({
        queryKey: ['organizations'],
        queryFn: async () => (await api.get('/api/organizations/check')).data,
      }),
  }),
);
