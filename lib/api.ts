// lib/api.ts
'use client';

import axios from 'axios';
import { useAPI } from '@/hooks/use-api';
import { Contract, Customer, InventoryItem, Invoice, User } from '@prisma/client';
import { superDeserialize, superSerialize } from '@/lib/superjson';
import { ENABLE_SUPERJSON } from './config';

const api = axios.create({
  // Use an environment variable for the base URL.
  // In Next.js, "NEXT_PUBLIC_" prefix makes it available to the browser.
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- TRANSFORM REQUEST (Client -> Server) ---
api.defaults.transformRequest = [
  (data) => {
    if (!ENABLE_SUPERJSON || !data) return JSON.stringify(data);

    // Serialize complex types (BigInt, Date) before sending
    const serialized = superSerialize(data);
    return JSON.stringify(serialized);
  },
];

// --- TRANSFORM RESPONSE (Server -> Client) ---
api.defaults.transformResponse = [
  (data) => {
    // Axios receives the raw string; we parse it first
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      return data;
    }

    if (!ENABLE_SUPERJSON) return parsed;

    // Use the safety-checked deserializer from your config
    return superDeserialize(parsed);
  },
];

export default api;

export const usersApi = useAPI<User>('/api/users', 'users');
export const invoicesAPI = useAPI<Invoice>('/api/invoices', 'invoices');
export const customersApi = useAPI<Customer>('/api/customers', 'customers');
export const contractsApi = useAPI<Contract>('/api/contracts', 'contracts');
export const itemsAPI = useAPI<InventoryItem>('/api/inventoryItems', 'inventoryItems');
