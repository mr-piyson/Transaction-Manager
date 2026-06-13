/**
 * root.ts
 * The single tRPC app router — merges every sub-router.
 * Import this in your Next.js API route handler.
 *
 * Usage in /app/api/trpc/[trpc]/route.ts:
 *   import { appRouter } from '@/lib/trpc/root';
 *   export type AppRouter = typeof appRouter;
 */

import { t } from '@/lib/trpc/context';
import { authRouter } from './auth';
// import { contractRouter } from './contracts';
// import { customerRouter } from './customers';
// import { invoiceRouter } from './invoices';
// import { itemRouter } from './items';
// import { organizationRouter } from './organizations';
// import { purchaseOrderRouter } from './purchase-orders';
// import { reportsRouter } from './reports';
// import { settingsRouter } from './settings';
// import { stockRouter } from './stock';
// import { supplierRouter } from './supplier';
// import { warehouseRouter } from './warehouses';

export const AppRouter = t.router({
  auth: authRouter,
  // organizations: organizationRouter,
  // customers: customerRouter,
  // suppliers: supplierRouter,
  // items: itemRouter,
  // warehouses: warehouseRouter,
  // purchaseOrders: purchaseOrderRouter,
  // stock: stockRouter,
  // invoices: invoiceRouter,
  // contracts: contractRouter,
  // reports: reportsRouter,
  // settings: settingsRouter,
});

export type AppRouter = typeof AppRouter;
