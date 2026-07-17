import { t } from '@/lib/trpc/context';
import { attachmentsRouter } from './attachments/attachments.router';
import { authRouter } from './auth/auth.router';
import { categoriesRouter } from './categories/categories.router';
import { contractsRouter } from './contracts/contracts.router';
import { currenciesRouter } from './currencies/currencies.router';
import { customersRouter } from './customers/customers.router';
import { exchangeRatesRouter } from './settings/exchange-rates.router';
import { hrRouter } from './hr/hr.router';
import { invoicesRouter } from './invoices/invoices.router';
import { journalsRouter } from './journals/journal.router';
import { itemsRouter } from './items/items.router';
import { notificationsRouter } from './notifications/notifications.router';
import { organizationsRouter } from './organizations/organizations.router';
import { purchaseOrdersRouter } from './purchase-orders/purchase-orders.router';
import { reportsRouter } from './reports/reports.router';
import { settingsRouter } from './settings/settings.router';
import { setupRouter } from './setup/setup.router';
import { stockRouter } from './stock/stock.router';
import { suppliersRouter } from './suppliers/suppliers.router';
import { unitsRouter } from './units/units.router';
import { usersRouter } from './users/users.router';
import { warehousesRouter } from './warehouses/warehouses.router';

export const appRouter = t.router({
  attachments: attachmentsRouter,
  auth: authRouter,
  categories: categoriesRouter,
  contracts: contractsRouter,
  currencies: currenciesRouter,
  customers: customersRouter,
  exchangeRates: exchangeRatesRouter,
  hr: hrRouter,
  invoices: invoicesRouter,
  journals: journalsRouter,
  items: itemsRouter,
  notifications: notificationsRouter,
  organizations: organizationsRouter,
  purchaseOrders: purchaseOrdersRouter,
  reports: reportsRouter,
  settings: settingsRouter,
  setup: setupRouter,
  stock: stockRouter,
  suppliers: suppliersRouter,
  units: unitsRouter,
  users: usersRouter,
  warehouses: warehousesRouter,
});

export type AppRouter = typeof appRouter;
