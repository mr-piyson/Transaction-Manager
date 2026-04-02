import z from 'zod';
import { base, router } from '@/lib/trpc/server';
import { invoiceRouter } from '@/lib/trpc/routers/invoices';
import { contractRouter } from './routers/contracts';
import { customerRouter } from './routers/customers';
import { inventoryRouter } from './routers/inventory';
import { invoiceLinesRouter } from './routers/invoice-lines';
import { paymentRouter } from './routers/payments';
import { organizationRouter } from './routers/organizations';

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
