'use client';

import { createApiHooks } from '@/hooks/use-api';
import { Contract, Customer, InventoryItem, Invoice, User } from '@prisma/client';

export const usersApi = createApiHooks<User>('/api/users', 'users');
export const invoicesAPI = createApiHooks<Invoice>('/api/invoices', 'invoices');
export const customersApi = createApiHooks<Customer>('/api/customers', 'customers');
export const contractsApi = createApiHooks<Contract>('/api/contracts', 'contracts');
export const itemsAPI = createApiHooks<InventoryItem>('/api/inventoryItems', 'inventoryItems');
