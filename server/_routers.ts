import { router } from '@/lib/trpc/server';
import { invoiceRouter } from '@/server/invoices';
import { contractRouter } from '@/server/contracts';
import { customerRouter } from '@/server/customers';
import { inventoryRouter } from '@/server/inventory';
import { invoiceLinesRouter } from '@/server/invoice-lines';
import { paymentRouter } from '@/server/payments';
import { organizationRouter } from '@/server/organizations';
import { analyticsRouter } from '@/server/analytics';
import { authRouter } from '@/server/auth';

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
});

export type AppRouter = typeof appRouter;
