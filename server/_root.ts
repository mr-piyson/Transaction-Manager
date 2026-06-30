import { t } from '@/lib/trpc/context';
import { authRouter } from './auth';
import { contractsRouter } from './contracts.router';
import { customersRouter } from './customers.router';
import { hrRouter } from './hr';
import { invoicesRouter } from './invoices.router';
import { usersRouter } from './users.router';
import { itemsRouter } from './items';
import { organizationsRouter } from './organizations.router';
import { purchaseOrdersRouter } from './purchase-orders.router';
import { reportsRouter } from './reports.router';
import { categoriesRouter } from './categories';
import { settingsRouter } from './settings.router';
import { stockRouter } from './stock.router';
import { notificationsRouter } from './notifications.router';
import { suppliersRouter } from './suppliers.router';
import { warehousesRouter } from './warehouses.router';

export const appRouter = t.router({
  auth: authRouter,
  categories: categoriesRouter,
  customers: customersRouter,
  hr: hrRouter,
  invoices: invoicesRouter,
  items: itemsRouter,
  notifications: notificationsRouter,
  organizations: organizationsRouter,
  purchaseOrders: purchaseOrdersRouter,
  reports: reportsRouter,
  settings: settingsRouter,
  stock: stockRouter,
  suppliers: suppliersRouter,
  warehouses: warehousesRouter,
  contracts: contractsRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
