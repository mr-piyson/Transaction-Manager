# Architecture Guide

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5.9 |
| **API Layer** | tRPC v11 (end-to-end typesafe RPC) |
| **ORM** | Prisma 7 (PostgreSQL provider) |
| **Auth** | Better Auth v1.6 (email/password + JWT + admin plugins) |
| **Authorization** | CASL (ability-based permissions) |
| **Forms** | React Hook Form + Zod |
| **UI** | Radix UI / Base UI + Tailwind CSS 4 + Framer Motion |
| **Tables** | TanStack Table + AG Grid |
| **Charts** | Recharts |
| **i18n** | next-intl v4 (fully client-side) |
| **Serialization** | SuperJSON (for Date/Decimal transport) |

---

## Project Structure

```
Transaction-Manager/
├── app/                  # Next.js App Router pages & layouts
│   ├── api/              # Auth, tRPC, file uploads
│   ├── app/              # Main dashboard pages (ERP, HR)
│   ├── auth/             # Sign-in / sign-up pages
│   └── setup/            # Org onboarding wizard
├── auth/                 # Better Auth config (client + server)
├── messages/             # i18n translation files (en.json, ar.json)
├── components/           # React components (domain + shared UI)
├── hooks/                # React hooks (ability, currency, date, locale)
├── lib/                  # Shared utilities (tRPC, abilities, db, env)
├── server/               # tRPC routers & services (domain modules)
├── prisma/               # Database schema & migrations
└── scripts/              # Utility scripts
```

---

## Architecture Layers

### 1. Database (Prisma)
- ~40 models covering multi-tenancy, auth, RBAC, financial, procurement, inventory, contacts, GL, contracts, expenses, incomes
- All monetary values use `Decimal` (never `Int`/`Float`)
- Soft delete via `deletedAt` on auditable entities
- Optimistic locking via `version Int` on high-contention tables
- Immutable `StockMovement` and `AuditLog`

### 2. API (tRPC)

```
Browser → Next.js → tRPC fetch → createContext → middleware → procedure
```

Three procedure tiers:
- `publicProcedure` — No auth (auth endpoints, health)
- `protectedProcedure` — Auth required, no org (SUPER_ADMIN)
- `orgProcedure` — Auth + org required (99% of ERP operations)

### 3. Auth (Better Auth)
- Email/password + JWT plugin + admin plugin
- `createContext`: resolves session → DB user → permissions → CASL ability

### 4. Authorization (CASL)
- `Action` union defines all permission codes (e.g. `invoice:create`)
- `SUPER_ADMIN` → `manage:all`, `OWNER` → `manage:all` within org, others → DB-mapped
- `assertCan()` enforced before every mutation

### 5. Service Layer
- Domain services co-located with routers or in `server/shared/`
- `calculator.ts` — pure invoice total computation
- `audit.service.ts` — audit log writer (inside `$transaction`)
- `cron.ts` — scheduled jobs (overdue invoices, low stock alerts)

---

## Key Data Flows

### Invoice Lifecycle
```
DRAFT → PENDING_APPROVAL → APPROVED → SENT (stock deducted)
                                 ↓
                          PARTIAL/PENDING → PAID
                                 ↓
                           CANCELLED (stock returned)
```

### Serial Generation
Document serials use `DocumentSequence` table with `SELECT FOR UPDATE` row locking inside `$transaction` to prevent duplicate serials.

### Multi-tenancy
Every query injects `organizationId` from context (never from client input). All Prisma queries filter by `organizationId` and `deletedAt: null`.

---

## Data Flow Diagram

```
Browser ←→ Next.js App Router
              ↓
        createContext()
              ↓
    Better Auth Session
              ↓
    DB User + Permissions
              ↓
    CASL Ability Builder
              ↓
    Middleware Stack (logger → isAuthed → hasOrg)
              ↓
    Procedure Body (assertCan → Zod → Business logic → Prisma $transaction)
              ↓
    PostgreSQL
```

---

## Enterprise File Storage

- Dedicated Route Handler (`/api/upload`) with `multipart/form-data`
- tRPC handles metadata CRUD only (via Attachment router)
- Files stored in `public/uploads/YYYY/MM/` (date-partitioned)
- Deduplication via SHA-256 hashes
- Images optimized with Sharp, thumbnails generated
- MIME validation via `file-type` (binary magic bytes)
- `StorageService` abstraction allows future S3/R2 migration

### Key Services
| Service | Purpose |
|---|---|
| `UploadService` | Upload pipeline orchestrator |
| `AttachmentService` | CRUD + reference counting |
| `HashService` | SHA-256 computation |
| `ImageService` | Sharp compression + thumbnails |
| `StorageService` | Disk write/read/delete |

### CRUD
- **Create**: `POST /api/upload` → metadata → `tRPC attachment.create` (links to entity)
- **Read**: `tRPC attachment.list` by `entityType + entityId`
- **Delete**: Remove `Attachment` row; physical file deleted only if no remaining references

---

## Multi-App Architecture

The platform supports multiple business applications (ERP, HRMS) within a single codebase.

- **App registry** (`lib/apps.ts`): defines each app's slug, name, icon, routes
- **URL routing**: `/app/*` (ERP), `/app/hr/*` (HR)
- **Sidebar**: dynamically renders routes from active app, `AppSwitcher` dropdown

**Adding a new app**:
1. Add routes in `lib/apps.ts`
2. Create page components under `app/app/{slug}/`
3. Add tRPC routers under `server/{slug}/`
4. Add i18n keys to `messages/`
