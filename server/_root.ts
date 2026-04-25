/**
 * root.ts
 * The single tRPC app router — merges every sub-router.
 * Import this in your Next.js API route handler.
 *
 * Usage in /app/api/trpc/[trpc]/route.ts:
 *   import { appRouter } from '@/lib/trpc/root';
 *   export type AppRouter = typeof appRouter;
 */

import { t } from '@/lib/trpc/server';

import { authRouter } from './auth';
import { organizationRouter } from './organizations';
import { customerRouter } from './customers';
import { supplierRouter } from './supplier';
import { itemRouter } from './items';
import { warehouseRouter } from './warehouses';
import { jobRouter } from './jobs';
import { purchaseOrderRouter } from './purchase-orders';
import { stockRouter } from './stock';
import { invoiceRouter } from './invoices';
import { contractRouter } from './contracts';
import { reportsRouter } from './reports';

export const appRouter = t.router({
  auth: authRouter,
  organizations: organizationRouter,
  customers: customerRouter,
  suppliers: supplierRouter,
  items: itemRouter,
  warehouses: warehouseRouter,
  jobs: jobRouter,
  purchaseOrders: purchaseOrderRouter,
  stock: stockRouter,
  invoices: invoiceRouter,
  contracts: contractRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;