import { router } from '@/lib/trpc/server';
import { organizationRouter } from '@/server/organizations';
import { authRouter } from '@/server/auth';
import { customerRouter } from '@/server/customers';
import { jobRouter } from '@/server/jobs';
import { itemRouter } from './items';
import { invoiceRouter } from './invoices';

export const appRouter = router({
  auth: authRouter,
  organizations: organizationRouter,
  customers: customerRouter,
  jobs: jobRouter,
  items: itemRouter,
  invoices: invoiceRouter,
});

export type AppRouter = typeof appRouter;
