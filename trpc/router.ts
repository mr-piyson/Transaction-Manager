import z from 'zod';
import { base, router } from '@/trpc/server';
import { invoiceRouter } from '@/api/invoices';
import { contractRouter } from '../api/contracts';
import { customerRouter } from '../api/customers';
import { inventoryRouter } from '../api/inventory';
import { invoiceLinesRouter } from '../api/invoice-lines';
import { paymentRouter } from '../api/payments';
import { organizationRouter } from '../api/organizations';

export const appRouter = router({
  hello: base.input(z.object({ name: z.string().optional() })).query(({ input }) => {
    return { greeting: `Hello, ${input.name ?? 'world'}!` };
  }),
  invoices: invoiceRouter,
  contracts: contractRouter,
  customers: customerRouter,
  inventory: inventoryRouter,
  invoiceLines: invoiceLinesRouter,
  payments: paymentRouter,
  organizations: organizationRouter,
});

export type AppRouter = typeof appRouter;
