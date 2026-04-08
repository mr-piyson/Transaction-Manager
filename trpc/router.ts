import { router } from '@/trpc/server';
import { invoiceRouter } from '@/server/invoices';
import { contractRouter } from '@/server/contracts';
import { customerRouter } from '@/server/customers';
import { inventoryRouter } from '@/server/inventory';
import { invoiceLinesRouter } from '@/server/invoice-lines';
import { paymentRouter } from '@/server/payments';
import { organizationRouter } from '@/server/organizations';
import { analyticsRouter } from '@/server/analytics';

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
