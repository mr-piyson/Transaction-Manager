import { router } from '@/trpc/server';
import { invoiceRouter } from '@/api/invoices';
import { contractRouter } from '@/api/contracts';
import { customerRouter } from '@/api/customers';
import { inventoryRouter } from '@/api/inventory';
import { invoiceLinesRouter } from '@/api/invoice-lines';
import { paymentRouter } from '@/api/payments';
import { organizationRouter } from '@/api/organizations';
import { analyticsRouter } from '@/api/analytics';

export const appRouter = router({
  invoices: invoiceRouter,
  contracts: contractRouter,
  customers: customerRouter,
  inventory: inventoryRouter,
  invoiceLines: invoiceLinesRouter,
  payments: paymentRouter,
  organizations: organizationRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
