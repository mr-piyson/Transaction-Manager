import { router } from '@/lib/trpc/server';
import { invoiceRouter } from '@/server/invoices';
import { contractRouter } from '@/server/contracts';
import { customerRouter } from '@/server/customers';
import { inventoryRouter } from '@/server/supplierItems';
import { invoiceLinesRouter } from '@/server/invoice-lines';
import { paymentRouter } from '@/server/payments';
import { organizationRouter } from '@/server/organizations';
import { analyticsRouter } from '@/server/analytics';
import { authRouter } from '@/server/auth';
import { supplierRouter } from '@/server/suppliers';
import { purchaseRouter } from '@/server/purchases';
import { stockRouter } from '@/server/stocks';
import { itemRouter } from '@/server/items';
import { warehouseRouter } from '@/server/warehouses';

export const appRouter = router({
  auth: authRouter,
  invoices: invoiceRouter,
  contracts: contractRouter,
  customers: customerRouter,
  inventory: inventoryRouter,
  invoiceLines: invoiceLinesRouter,
  payments: paymentRouter,
  organizations: organizationRouter,
  analytics: analyticsRouter,
  suppliers: supplierRouter,
  purchases: purchaseRouter,
  stock: stockRouter,
  items: itemRouter,
  warehouses: warehouseRouter,
});

export type AppRouter = typeof appRouter;
