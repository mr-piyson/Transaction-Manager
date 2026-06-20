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
| **Auth** | Better Auth v1.6 (email/password + JWT plugin) |
| **Authorization** | CASL (ability-based permissions) |
| **Forms** | React Hook Form + Zod |
| **UI** | Radix UI / Base UI + Tailwind CSS 4 + Framer Motion |
| **Tables** | TanStack Table + AG Grid |
| **Charts** | Recharts |
| **Styling** | Tailwind CSS 4 + class-variance-authority |
| **Validation** | Zod (with t3-oss/env-core for env vars) |
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
│   ├── app/             # Main dashboard pages
│   ├── auth/            # Sign-in / sign-up pages
│   └── setup/           # Org onboarding wizard
├── auth/
│   ├── auth-client.ts   # Better Auth client (browser)
│   └── auth-server.ts   # Better Auth server config + helpers
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
│   ├── nav.ts           # Navigation configuration
│   ├── permissions.ts   # Re-exports for type convenience
│   ├── sequences.ts     # Race-safe document serial generation
│   ├── upload.ts        # Upload utilities
│   ├── utils.ts         # General utilities
│   └── validations.ts   # Shared Zod schemas (pagination, etc.)
├── server/              # tRPC server routers & services
│   ├── _root.ts         # App router composition
│   ├── auth.ts          # Auth router (signIn, signUp, session)
│   ├── invoices.router.ts
│   ├── invoices.service.ts   # Stock deduction/return for invoices
│   ├── customers.router.ts
│   ├── suppliers.router.ts
│   ├── items.ts         # Item catalogue router
│   ├── stock.router.ts  # Stock levels, movements, adjustments
│   ├── warehouses.router.ts
│   ├── purchase-orders.router.ts
│   ├── contracts.router.ts
│   ├── payments.service.ts   # Payment CRUD + invoice payment sync
│   ├── reports.router.ts     # Dashboard summary, AR aging
│   ├── organizations.router.ts
│   ├── settings.router.ts    # Org settings, tax rates, chart of accounts
│   └── audit.service.ts      # Audit log writer
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

- `auth/auth-server.ts`: Configures Better Auth with Prisma adapter, email/password, and JWT plugin. Defines custom user fields: `organizationId`, `firstName`, `lastName`, `isActive`.
- `auth/auth-client.ts`: Creates browser client with dynamic `baseURL` detection.
- `server/auth.ts`: tRPC router wrapping `auth.api.signInEmail`, `auth.api.signUpEmail`, `getSession`.

### 4. Authorization (CASL)

- The `Action` union type defines all permission codes (e.g. `"invoice:create"`, `"stock:adjust"`)
- `defineAbilitiesFor()` builds abilities:
  - `SUPER_ADMIN` → `manage:all` (no org scope)
  - `OWNER` → `manage:all` within org scope
  - Other roles → mapped from `RolePermission` DB rows
  - `VIEWER` → explicit deny on all mutation actions
- `MUTATION_ACTIONS` list enforced at the end of `defineAbilitiesFor()` prevents VIEWER bypass

### 5. Service Layer / Business Logic

Services live in `server/*.service.ts` files:

- **`invoices.service.ts`**: Stock deduction (`deductStockForInvoice`) and return (`returnStockForCancelledInvoice`, `returnStockForCreditNote`). Guards against negative stock with detailed error messages.
- **`payments.service.ts`**: Payment CRUD with denormalized invoice payment totals. Uses `resolvePaymentStatus` and `resolveInvoiceStatus` to update `Invoice.amountPaid`, `amountDue`, `paymentStatus`, `status`.
- **`audit.service.ts`**: Thin wrapper creating `AuditLog` rows. Designed to be called inside the same `$transaction` as the mutation.
- **`lib/calculator.ts`**: Pure function `calculateInvoiceTotals()` — no side effects, no DB calls. Computes per-line subtotals, tax (per-line rounding), totals, and COGS.

### 6. Module Routers

Each domain has a tRPC router following consistent patterns:

| Module | Router File | Key Operations |
|---|---|---|
| Auth | `auth.ts` | signIn, signUp, getSession |
| Invoices | `invoices.router.ts` | list, byId, create, update, send, cancel, convertQuote, delete, addPayment, deletePayment, arAging |
| Customers | `customers.router.ts` | list, byId, create, update, delete |
| Suppliers | `suppliers.router.ts` | list, byId, create, update, delete, addItem, updateItem, removeItem |
| Items | `items.ts` | list, byId, create, update, delete, withStock |
| Stock | `stock.router.ts` | list (with search/filter), adjust, transfer, movements |
| Warehouses | `warehouses.router.ts` | list, byId, create, update, delete |
| Purchase Orders | `purchase-orders.router.ts` | list, byId, create, update, order, receive, cancel, addPayment, deletePayment |
| Contracts | `contracts.router.ts` | list, byId, create, update, delete |
| Organizations | `organizations.router.ts` | setup (onboarding wizard) |
| Settings | `settings.router.ts` | getOrg, updateOrg, taxRates CRUD, ledgerAccounts CRUD |
| Reports | `reports.router.ts` | summary (dashboard), sales, inventory |

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
