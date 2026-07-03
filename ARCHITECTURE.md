# Architecture Guide

This document describes the architecture, major design decisions, module structure, and data flow of the Transaction Manager ERP system.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5.9 |
| **API Layer** | tRPC v11 (end-to-end typesafe RPC) |
| **ORM** | Prisma 7 (PostgreSQL provider) |
| **Auth** | Better Auth v1.6 (email/password + JWT plugin + admin plugin) |
| **Authorization** | CASL (ability-based permissions) |
| **Forms** | React Hook Form + Zod |
| **UI** | Radix UI / Base UI + Tailwind CSS 4 + Framer Motion |
| **Tables** | TanStack Table + AG Grid |
| **Charts** | Recharts |
| **Styling** | Tailwind CSS 4 + class-variance-authority |
| **Validation** | Zod (with t3-oss/env-core for env vars) |
| **i18n** | next-intl v4 (fully client-side, no middleware/proxy) |
| **Serialization** | SuperJSON (for Date/Decimal transport) |

---

## Project Structure

```
Transaction-Manager/
├── app/                  # Next.js App Router pages & layouts
│   ├── api/
│   │   ├── auth/        # Better Auth API handlers
│   │   ├── trpc/        # tRPC HTTP adapter (fetch)
│   │   └── uploads/     # File upload endpoint
│   ├── app/             # Main dashboard pages (multi-app)
│   │   ├── hr/          # HRMS module pages
│   │   ├── invoices/
│   │   ├── customers/
│   │   └── ...
│   ├── auth/            # Sign-in / sign-up pages
│   └── setup/           # Org onboarding wizard
├── auth/
│   ├── auth-client.ts   # Better Auth client (browser)
│   └── auth-server.ts   # Better Auth server config + helpers
├── messages/            # i18n translation files
│   ├── en.json          # English translations (~460 keys, 16 namespaces)
│   └── ar.json          # Arabic translations (RTL)
├── components/          # React components
│   ├── ui/              # Generic UI primitives (shadcn-style)
│   ├── invoices/        # Invoice-specific components
│   ├── customers/       # Customer-specific components
│   ├── contracts/
│   ├── purchases-orders/
│   ├── items/
│   ├── suppliers/
│   ├── warehouses/
│   ├── cities/
│   ├── dialogs/         # Shared dialog/modal components
│   ├── sidebar.tsx
│   └── ...
├── hooks/               # React hooks
│   ├── use-locale.ts    # Cookie-based locale switcher
│   ├── use-ability.tsx
│   ├── use-currency.tsx
│   ├── use-date-format.tsx
│   ├── use-mobile.ts
│   └── use-table-theme.tsx
├── lib/                 # Shared application logic
│   ├── trpc/
│   │   ├── context.ts   # tRPC init, middleware, procedure builders
│   │   ├── server.ts    # createContext (auth resolution, CASL setup)
│   │   └── client.ts    # tRPC React client
│   ├── abilities.ts     # CASL ability definitions & builder
│   ├── calculator.ts    # Pure invoice total computation
│   ├── db.ts            # PrismaClient singleton
│   ├── env.ts           # Zod-validated env vars
│   ├── error.ts         # Typed error hierarchy (AppError base)
│   ├── files.ts         # File utilities
│   ├── apps.ts          # Multi-app registry (ERP, HR, ...)
│   ├── permissions.ts   # Re-exports for type convenience
│   ├── sequences.ts     # Race-safe document serial generation
│   ├── upload.ts        # Upload utilities
│   ├── utils.ts         # General utilities
│   └── validations.ts   # Shared Zod schemas (pagination, etc.)
├── server/              # tRPC server routers & services (domain modules)
│   ├── _root.ts         # App router composition — wires all domain routers
│   ├── auth/
│   │   └── auth.router.ts       # signIn, signUp, session, profile, password
│   ├── users/
│   │   └── users.router.ts      # User CRUD, roles, permissions, rolePermissions
│   ├── organizations/
│   │   └── organizations.router.ts  # Org setup (onboarding), get, update
│   ├── settings/
│   │   └── settings.router.ts   # Org settings, tax rates, chart of accounts, key-value settings
│   ├── invoices/
│   │   ├── invoices.router.ts   # Invoice lifecycle (CRUD, send, approve, cancel, payments)
│   │   ├── invoices.service.ts  # Stock deduction/return for invoice transitions
│   │   └── payments.service.ts  # Payment CRUD + invoice payment status sync
│   ├── customers/
│   │   └── customers.router.ts  # Customer CRUD, credit balance
│   ├── suppliers/
│   │   └── suppliers.router.ts  # Supplier CRUD, supplier-item linking
│   ├── items/
│   │   └── items.router.ts      # Item catalogue, price resolution, stock summary
│   ├── categories/
│   │   └── categories.router.ts # Family → Class → Commodity hierarchy, SKU generation
│   ├── stock/
│   │   └── stock.router.ts      # Stock levels, adjustments, transfers, movements
│   ├── warehouses/
│   │   └── warehouses.router.ts # Warehouse CRUD
│   ├── purchase-orders/
│   │   └── purchase-orders.router.ts  # PO lifecycle (CRUD, approve, order, receive)
│   ├── contracts/
│   │   └── contracts.router.ts  # Contract lifecycle (CRUD, activate, expire, renew)
│   ├── reports/
│   │   └── reports.router.ts    # Dashboard summary, revenue, AR aging, sales reports
│   ├── notifications/
│   │   ├── notifications.router.ts    # Notification list, mark read, archive
│   │   └── notifications.shared.ts    # Notification types, settings keys, create helper
│   ├── hr/
│   │   └── hr.router.ts         # HRMS module (placeholder)
│   └── shared/
│       ├── audit.service.ts     # Audit log writer (called inside $transaction)
│       └── cron.ts              # Scheduled jobs (overdue invoices, low stock alerts)
├── prisma/
│   ├── schema.prisma    # Full database schema (1783 lines)
│   └── ...migrations
├── scripts/             # Utility scripts
└── data/                # Seed data
```

---

## Architecture Layers

### 1. Database Layer (Prisma ORM)

The schema (`prisma/schema.prisma`) defines ~40 models covering:

- **Multi-tenancy**: `Organization` is the root; every entity has `organizationId`.
- **Auth**: `User`, `Session`, `Account`, `Verification`, `Jwks` (Better Auth standard)
- **RBAC**: `Permission`, `RolePermission`, `UserOrganizationRole`
- **Financial**: `Invoice`, `InvoiceLine`, `Payment`, `CreditNoteAllocation`
- **Procurement**: `PurchaseOrder`, `PurchaseLine`, `PurchasePayment`
- **Catalogue**: `Item` (Product/Service/Bundle), `ItemCategory`, `PriceList`, `PriceListLine`
- **Inventory**: `Warehouse`, `Stock` (per-item, per-warehouse), `StockMovement` (immutable)
- **Contacts**: `Customer`, `Supplier`, `SupplierItem`
- **GL/Accounting**: `LedgerAccount`, `JournalEntry`, `JournalLine`
- **Contracts**: `Contract`
- **Expenses**: `ExpenseCategory`, `Expense`
- **Cross-cutting**: `Address` (polymorphic), `Attachment`, `Tag`/`Tagging`, `Notification`, `AuditLog`
- **Sequences**: `DocumentSequence` (per-org, per-prefix serial counters)
- **Departments**: `Department` (hierarchical cost centres)
- **Approvals**: `ApprovalWorkflow`, `ApprovalStep`, `ApprovalRequest`, `ApprovalDecision`

**Key design principles**:
- All monetary values use `Decimal` (never `Int`/`Float`)
- Soft delete via `deletedAt` on all auditable entities
- Optimistic locking via `version Int` on high-contention tables
- Composite indexes covering query patterns
- Immutable `StockMovement` and `AuditLog` (no `updatedAt`)

### 2. API Layer (tRPC)

**Request flow**:

```
Browser → Next.js App Router → tRPC fetch adapter → createContext → middleware stack → procedure
```

**`createContext`** (`lib/trpc/server.ts`):
1. Parses `x-forwarded-for` to get client IP
2. Calls `auth.api.getSession()` to resolve Better Auth session
3. Fetches the DB user record with org role
4. Loads `RolePermission` rows → resolves permission codes
5. Calls `defineAbilitiesFor()` to build the CASL ability object
6. Returns `{ db, req, ipAddress, session, user, ability }`

**Three procedure tiers** (`lib/trpc/context.ts`):

| Procedure | Auth Required | Org Required | Use Case |
|---|---|---|---|
| `publicProcedure` | No | No | Auth endpoints, health checks |
| `protectedProcedure` | Yes | No | SUPER_ADMIN operations |
| `orgProcedure` | Yes | Yes | 99% of ERP operations |

**Authorization pattern**: 
- Middleware enforces **authentication** only
- Procedures enforce **authorization** inline via `assertCan(ctx.ability, action, subject, record?)`
- CASL checks against the actual record for field/condition-level rules

### 3. Authentication (Better Auth)

- `auth/auth-server.ts`: Configures Better Auth with Prisma adapter, email/password, JWT plugin, and admin plugin. Defines custom user fields: `organizationId`, `firstName`, `lastName`, `isActive`.
- `auth/auth-client.ts`: Creates browser client with dynamic `baseURL` detection.
- `server/auth/auth.router.ts`: tRPC router wrapping `auth.api.signInEmail`, `auth.api.signUpEmail`, `getSession`, and other session/password management endpoints.

**Admin plugin** (`better-auth/plugins/admin`):
- Configured with `defaultRole: 'admin'` and `adminRoles: ['admin']` (permissive — all users get full admin-level access to better-auth's built-in permissions).
- Adds a `role` column to the `User` table with default `'admin'`.
- Enables admin API endpoints: `createUser`, `setUserPassword`, `adminUpdateUser`, `banUser`, `unbanUser`, `listUsers`, `removeUser`, etc.
- Permission checks (`hasPermission`) use the user's `role` field against the admin plugin's access control; since default roles grant `'admin'` access to all `user` and `session` statements, every user can perform admin operations.

**User management flows**:

| Flow | Mechanism |
|------|-----------|
| **Org setup** (`organizations.router.ts:setup`) | `auth.api.signUpEmail()` creates the initial SUPER_ADMIN user with a credential account and session. The user is then updated via Prisma to set `platformRole: 'SUPER_ADMIN'`, `role: 'admin'`, and an `OWNER` org membership. |
| **Create user** (`users.router.ts:create`) | Uses `auth.api.createUser()` (admin plugin) for new users with a password — no session created, handles hashing and account creation internally. Custom fields (`firstName`, `lastName`, `organizationId`, `isActive`) are passed in the `data` object. Users without a password are created directly via Prisma with `role: 'admin'`. |
| **Update user** (`users.router.ts:update`) | Direct Prisma update for profile fields + `UserOrganizationRole` for role assignments. When email changes, the credential account's `accountId` is also updated to stay in sync. |
| **Set password** (`users.router.ts:setPassword`) | `auth.api.setUserPassword()` (admin plugin) — delegates hashing and account management to better-auth. |
| **Send password reset** (`users.router.ts:sendPasswordReset`) | `auth.api.requestPasswordReset()` — triggers better-auth's email-based reset flow. |
| **Toggle active** / **Delete** | Direct Prisma soft-delete / `isActive` toggle (better-auth has no equivalent for our custom `isActive` field or soft-delete pattern). |

**Note on role separation**: Better Auth's admin plugin `role` field controls access to better-auth admin endpoints only. Application-level authorization (per-module permissions like `invoice:create`) is handled separately via CASL and the `UserOrganizationRole` / `Permission` tables — the admin plugin role does not affect CASL ability checks.

### 4. Authorization (CASL)

- The `Action` union type defines all permission codes (e.g. `"invoice:create"`, `"stock:adjust"`)
- `defineAbilitiesFor()` builds abilities:
  - `SUPER_ADMIN` → `manage:all` (no org scope)
  - `OWNER` → `manage:all` within org scope
  - Other roles → mapped from `RolePermission` DB rows
  - `VIEWER` → explicit deny on all mutation actions
- `MUTATION_ACTIONS` list enforced at the end of `defineAbilitiesFor()` prevents VIEWER bypass

### 5. Service Layer / Business Logic

Services are co-located with their domain module or placed in `server/shared/` for cross-cutting concerns:

- **`server/invoices/invoices.service.ts`**: Stock deduction (`deductStockForInvoice`) and return (`returnStockForCancelledInvoice`, `returnStockForCreditNote`). Guards against negative stock with detailed error messages.
- **`server/invoices/payments.service.ts`**: Payment CRUD with denormalized invoice payment totals. Uses `resolvePaymentStatus` and `resolveInvoiceStatus` to update `Invoice.amountPaid`, `amountDue`, `paymentStatus`, `status`.
- **`server/shared/audit.service.ts`**: Thin wrapper creating `AuditLog` rows. Designed to be called inside the same `$transaction` as the mutation.
- **`server/shared/cron.ts`**: Scheduled jobs — overdue invoice detection (hourly) and low-stock alerts (every 6 hours).
- **`lib/calculator.ts`**: Pure function `calculateInvoiceTotals()` — no side effects, no DB calls. Computes per-line subtotals, tax (per-line rounding), totals, and COGS.

### 6. Module Routers

Each domain has its own module directory under `server/` with a tRPC router following consistent patterns:

| Module | Router Path | Key Operations |
|---|---|---|
| Auth | `server/auth/auth.router.ts` | signIn, signUp, session, me, signOut, updateProfile, changePassword, listSessions, revokeSession, revokeOtherSessions |
| Users | `server/users/users.router.ts` | list, create, update, setPassword, sendPasswordReset, toggleActive, delete; roles CRUD; permissions list; rolePermissions list/update |
| Invoices | `server/invoices/invoices.router.ts` | list, byId, create, update, send, cancel, convertQuote, delete, addPayment, deletePayment, arAging, submitForApproval, approve, reject |
| Customers | `server/customers/customers.router.ts` | list, byId, create, update, delete, setActive, creditBalance |
| Suppliers | `server/suppliers/suppliers.router.ts` | list, byId, create, update, delete, addSupplierItem, updateSupplierItem, deleteSupplierItem |
| Items | `server/items/items.router.ts` | list, byId, bySku, resolvePrice, create, update, delete, stockSummary |
| Categories | `server/categories/categories.router.ts` | listTree, family/class/commodity CRUD, generateSku |
| Stock | `server/stock/stock.router.ts` | list (with search/filter), byItem, adjust, transfer, movements, forItems |
| Warehouses | `server/warehouses/warehouses.router.ts` | list, byId, create, update, delete |
| Purchase Orders | `server/purchase-orders/purchase-orders.router.ts` | list, byId, create, update, submitForApproval, approve, reject, order, receive, cancel, delete, stockMovements |
| Contracts | `server/contracts/contracts.router.ts` | list, byId, create, update, delete, activate, expire, terminate, renew, stats |
| Reports | `server/reports/reports.router.ts` | summary, monthlyRevenue, invoiceStatusDistribution, arAging, revenueVsExpenses, salesByCustomer, topItems |
| Notifications | `server/notifications/notifications.router.ts` | list, getUnreadCount, markRead, markAllRead, archive, dismiss |
| Organizations | `server/organizations/organizations.router.ts` | setup (onboarding — creates org + SUPER_ADMIN via `auth.api.signUpEmail`), get, update |
| Settings | `server/settings/settings.router.ts` | getOrg, updateOrg, taxRates CRUD, ledgerAccounts CRUD, updateSetting, getSetting, getSettings |

Shared validation patterns:
- `assertCan()` before every mutation
- `offsetPaginationSchema` for list endpoints
- `paginatedResponse()` envelope: `{ data, meta: { total, page, limit, totalPages, hasNextPage, hasPrevPage } }`
- `writeAuditLog()` inside `$transaction` for mutation audit trails

### 7. Frontend

- **Pages** in `app/` use `app/` subdirectory for dashboard pages
- **API routes** in `app/api/` handle Auth (Better Auth), tRPC, and file uploads
- **Components** organized by domain in `components/` (invoices/, customers/, etc.) with shared UI primitives in `components/ui/`
- **Hooks** provide reusable state and utility access (ability checks, currency formatting, date formatting, mobile detection, table theming)
- **i18n**: Fully client-side internationalization via `next-intl` (see §7a)

### 7a. Internationalization (i18n)

**Architecture**: Fully client-side — no middleware, no proxy routing, no next-intl plugin. This avoids Next.js 16 proxy conflicts that caused 404s with `createMiddleware()`.

**Locale persistence**: `NEXT_LOCALE` cookie set by the client (JS). Server-side `cookies()` reads it in the root layout to set `<html dir="ltr|rtl" lang="en|ar">`.

**Locale switching**: `useLocaleSwitcher()` hook (`hooks/use-locale.ts`) sets the cookie → calls `window.location.reload()` → server reads cookie for RTL attributes → client picks up static messages via `I18nProvider`.

**Provider chain** (`components/i18n-provider.tsx`):
```
app/layout.tsx → I18nProvider → NextIntlClientProvider → {children}
```
- Statically imports both `en.json` and `ar.json` at build time (no async loading flash)
- Reads `NEXT_LOCALE` cookie to select the active message bundle
- Single `t` function from `useTranslations()` used across all pages and components

**Translation files** (`messages/en.json`, `messages/ar.json`):
- 16 namespaces: auth, invoices, customers, suppliers, items, purchaseOrders, contracts, warehouses, stock, reports, settings, dashboard, layout, common, locale, errors
- ~460 keys total in each language
- ICU message syntax for interpolation (e.g. `"{type} created by {name} on {date}"`)
- RTL-safe English translations for embedded strings in Arabic mode

**Key files**:
| File | Purpose |
|---|---|
| `components/i18n-provider.tsx` | Client provider wrapping `NextIntlClientProvider` |
| `hooks/use-locale.ts` | Cookie-based locale switcher with `window.location.reload()` |
| `components/locale-switcher.tsx` | Dropdown submenu for language selection |
| `messages/en.json` | English translations |
| `messages/ar.json` | Arabic translations |

**Trade-off**: `getTranslations()` unavailable in server components; locale switch triggers a full page reload instead of a smooth `router.refresh()`.

### 8. Error Handling

Custom error hierarchy (`lib/error.ts`):

```
AppError (extends TRPCError)
├── NotFoundError          → 404
├── ForbiddenError         → 403
├── UnauthorizedError      → 401
├── ConflictError          → 409
├── UnprocessableError     → 422
├── StaleDataError         → 412 (optimistic lock)
└── InternalError          → 500
```

`toAppError()` helper wraps unknown catches for consistent handling.

---

## Key Data Flows

### Invoice Lifecycle

```
DRAFT ──► DELETED (soft)
  │
  ├─ [approve] ──► PENDING_APPROVAL ──► APPROVED
  │                                          │
  └─ [send] ─────────────────────────────────┘
                │
           SENT ◄── (stock deducted via SALE_OUTBOUND movements)
             │
    ┌────────┴────────┐
    │                  │
  PARTIAL ◄── payment  OVERDUE
    │                  │
    └──────► PAID ◄───┘
               │
          CANCELLED (stock returned via RETURN_INBOUND movements)
```

**Stock deduction** happens at `DRAFT→SENT` transition. Only `PRODUCT` type items affect stock. Insufficient stock throws `UnprocessableError` with per-item shortfall details.

### Payment → Invoice Sync

Every payment mutation:
1. Creates/deletes the `Payment` row
2. Re-aggregates `SUM(amount)` on the invoice
3. Updates `Invoice.amountPaid`, `amountDue`, `paymentStatus`, and `status`
4. All within a single `$transaction`

### Serial Generation

Document serials (e.g. `INV-2025-00042`) use `DocumentSequence` table with `SELECT FOR UPDATE` row locking inside `$transaction` to prevent duplicate serials under concurrent load.

### Multi-tenancy

Every query injects `organizationId` from context (never from client input). All Prisma queries filter by `organizationId` and `deletedAt: null` as baseline guards.

### 9. Multi-App Architecture

The platform supports multiple business applications (ERP, HRMS, etc.) within a single codebase. Each app shares authentication, organization context, and the sidebar layout but has its own routes, sidebar navigation, and tRPC routers.

**App registry** (`lib/apps.ts`):
- Central `AppInfo[]` array defining each app's slug, name, icon, and routes
- Each app provides a `getRoutes(t)` function that returns its sidebar `RouteConfig[]`
- `getAppFromPath(pathname)` detects the active app from the URL path (e.g., `/app/hr/*` → HR, everything else → ERP)

**URL routing**:
- `/app/*` — ERP module pages (backward compatible, no changes to existing URLs)
- `/app/hr/*` — HR module pages

**Sidebar** (`app/app/App-Sidebar.tsx`):
- Dynamically renders routes from the currently active app
- `AppSwitcher` dropdown in the sidebar header lets users switch between apps
- Existing route rendering logic (`RouteGroup`, `RouteItem`) is reused across all apps

**i18n namespaces**:
- `apps.*` — App names and switcher labels
- `hr.*` — HR module translations (employees, departments, attendance, leave, payroll)
- Existing `layout.*`, `invoices.*`, etc. remain for ERP

**Adding a new app**:
1. Define routes in `lib/apps.ts` via a new `getRoutes()` function
2. Add the app entry to the `apps` array with slug, name key, and icon
3. Create page components under `app/app/{slug}/`
4. Add tRPC routers under `server/{slug}/` and wire into `_root.ts`
5. Add i18n keys to `messages/en.json` and `messages/ar.json`

---

## Data Flow Diagram

```
┌──────────────┐     tRPC/HTTP      ┌───────────────────┐
│   Browser    │ ◄────────────────► │ Next.js App Router │
│ (React App)  │                    │  /api/trpc/[...]  │
└──────┬───────┘                    └─────────┬─────────┘
       │                                      │
       │                              createContext()
       │                                      │
       │                               ┌──────┴──────┐
       │                               │ Better Auth  │
       │                               │  Session     │
       │                               └──────┬──────┘
       │                                      │
       │                               ┌──────┴──────┐
       │                               │ DB User +   │
       │                               │ Permissions  │
       │                               └──────┬──────┘
       │                                      │
       │                               ┌──────┴──────┐
       │                               │ CASL Ability │
       │                               │  Builder     │
       │                               └──────┬──────┘
       │                                      │
       │                               ┌──────┴──────────────┐
       │                          ┌────┤ tRPC Context Ready  │
       │                          │    │ {db, user, ability} │
       │                          │    └─────────────────────┘
       │                     ┌────┴────┴──────────────┐
       │                     │  Middleware Stack       │
       │                     │  logger → isAuthed →    │
       │                     │  hasOrg (for orgProc)   │
       │                     └───────────┬────────────┘
       │                                 │
       │                     ┌───────────┴──────────────┐
       │                     │  Procedure Body           │
       │                     │  1. assertCan()           │
       │                     │  2. Zod input validation  │
       │                     │  3. Business logic        │
       │                     │     (calculator, service) │
       │                     │  4. Prisma $transaction   │
       │                     │     (DB writes + audit)   │
       │                     └───────────┬──────────────┘
       │                                 │
       │                     ┌───────────┴──────────────┐
       │                     │  PostgreSQL (via Prisma)  │
       │                     └──────────────────────────┘
```
