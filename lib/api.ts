// lib/api-utils.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from './env';

export type ApiResponseType<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  validation?: Record<string, string[]>;
};

export class ApiResponse {
  static success<T>(data: T, status = 200) {
    return NextResponse.json(data, { status });
  }

  static validationError(errors: z.ZodError) {
    const validationTree = z.treeifyError(errors);
    return NextResponse.json(
      {
        success: false,
        validation: validationTree,
        error: 'Validation Failed',
      },
      { status: 400 },
    );
  }

  static serverError(message: any = 'Internal Server Error', status = 500) {
    if (env.NODE_ENV === 'development') {
      console.log(message);
    }
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

import axios from 'axios';
import { InventoryItem, Invoice } from '@/types/generics';
import { mockInventoryItems, mockInvoice } from './mock-data';

// Create axios instance with default config
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Inventory API
export const inventoryApi = {
  getAll: async (): Promise<InventoryItem[]> => {
    await delay(300);
    // In a real app, this would be: return (await api.get('/inventory')).data;
    return mockInventoryItems;
  },

  search: async (query: string): Promise<InventoryItem[]> => {
    await delay(200);
    const lowerQuery = query.toLowerCase();
    return mockInventoryItems.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.sku.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery),
    );
  },

  getById: async (id: string): Promise<InventoryItem | undefined> => {
    await delay(100);
    return mockInventoryItems.find((item) => item.id === id);
  },
};

// Invoice API
export const invoiceApi = {
  get: async (id: string): Promise<Invoice> => {
    await delay(300);
    // In a real app: return (await api.get(`/invoices/${id}`)).data;
    return { ...mockInvoice, id };
  },

  save: async (invoice: Invoice): Promise<Invoice> => {
    await delay(500);
    // In a real app: return (await api.put(`/invoices/${invoice.id}`, invoice)).data;
    console.log('Saving invoice:', invoice);
    return invoice;
  },

  create: async (invoice: Partial<Invoice>): Promise<Invoice> => {
    await delay(500);
    // In a real app: return (await api.post('/invoices', invoice)).data;
    return { ...mockInvoice, ...invoice } as Invoice;
  },
};

export default api;
