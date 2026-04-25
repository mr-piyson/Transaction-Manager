# Software Requirements Specification — Field Operations ERP

## 1. Project overview

This system is a small, scalable ERP for a CCTV installation business. It covers the complete job lifecycle: customer negotiation → supplier purchasing → stock management → job tracking → invoicing → payment collection → financial reporting. The stack is Next.js 16 + tRPC + Prisma ORM + shadcn/ui, running entirely on Bun, targeting PostgreSQL in production and SQLite in development.

---

## 3. Functional requirements

### 3.1 Authentication & multi-tenancy

The system supports a single `Organization` as the root tenant. `User` rows belong to that org. The `UserOrganizationRole` junction allows a user to hold ADMIN or USER role within the org. A SUPER_ADMIN global role exists on `User.role` for platform-level access. All data queries must be scoped by `organizationId` — no cross-org data leakage. Session management is handled by Better Auth (inferred from the `Account`, `Session`, `Verification`, `Jwks` models in your schema).

### 3.2 Customer management

Create, read, update, and soft-delete customers. Fields: name, phone, email, address, tax ID (customer VAT number), credit limit, notes. Soft delete via `deletedAt`. Customers link to invoices and contracts. A walk-in customer flag (`Invoice.isWalkIn`) allows invoicing without a named customer — this is already in your schema and is the right pattern.

### 3.3 Supplier & item catalogue

**Suppliers:** Create, update, soft-delete. Fields: name, phone, email, address, contact name, website, tax ID, notes.

**Item catalogue (`Item` model):** Each item has a type (PRODUCT or SERVICE), SKU (unique per org), name, description, unit of measure, default purchase price, default sales price, category, tax rate, and minimum stock level. Products are physically tracked in stock; services are not. Add `isSaleable: Boolean` (see §2 correction).

**Supplier price list (`SupplierItem`):** Each supplier can have their own SKU, name, and quoted `basePrice` for any catalogue item. This acts as the quotation template. When raising a purchase order, the app pre-fills unit cost from the matched `SupplierItem.basePrice` for the selected supplier, but the user can override it.

**"Other" supplier:** A seeded supplier record used as a catch-all when no specific supplier is identified. The app UI shows an "Unknown / Other" option; the backend assigns the fixed seed ID.

### 3.4 Job / project tracking _(missing from your schema — needs adding)_

A `Job` model is needed to represent a unit of work (e.g. a CCTV installation project). An invoice is generated from a completed job. Required fields:

```
model Job {
  id          String    @id @default(cuid())
  title       String
  description String?
  status      JobStatus @default(NOT_STARTED)
  startDate   DateTime?
  endDate     DateTime?
  completedAt DateTime?

  customerId     String?
  customer       Customer? @relation(...)

  organizationId String
  organization   Organization @relation(...)

  invoices Invoice[]   // one job can produce one invoice (or none)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Add a `jobId String?` foreign key to `Invoice`. When the manager marks a job `COMPLETED`, the UI should offer a "Create Invoice" action that pre-populates the invoice draft from the job's associated items and labour.

### 3.5 Purchase order management

Raise purchase orders against a supplier (or "Other"). Each PO line references a catalogue item, has a quantity, unit cost (pre-filled from `SupplierItem.basePrice` but editable), and tax amount. PO status flows: DRAFT → ORDERED → PARTIAL_RECEIVED → RECEIVED → CANCELLED.

When the PO is marked RECEIVED (or PARTIAL_RECEIVED for the received qty), the application must in a single `$transaction`:

1. Upsert `Stock` quantity for each received line (per warehouse).
2. Insert a `StockMovement` row of type `PURCHASE_INBOUND` linked to each `PurchaseLine`.
3. Update `PurchaseLine.receivedQty`.
4. Update `PurchaseOrder.status`.

Non-saleable items purchased via PO do not need a sales price set afterward — they are consumed internally and tracked only via `StockMovement`.

Supplier payments are tracked in `PurchasePayment` (already in your schema). The AP (accounts payable) balance per PO is `PO.total − sum(PurchasePayment.amount)`.

### 3.6 Stock management

Stock is tracked per item per warehouse via the `Stock` model. The `quantity` field must never go negative — enforce this via a DB CHECK constraint (noted in your schema comment at line 491) and an application-layer guard before deducting.

Every stock change goes through a `StockMovement` row. No direct updates to `Stock.quantity` are permitted outside of a transaction that also inserts the matching movement. Movement types and their triggers:

| Type                 | Trigger                        |
| -------------------- | ------------------------------ |
| `PURCHASE_INBOUND`   | PO marked received             |
| `SALE_OUTBOUND`      | Invoice confirmed / sent       |
| `RETURN_INBOUND`     | Credit note issued to customer |
| `RETURN_OUTBOUND`    | Items returned to supplier     |
| `ADJUSTMENT_UP/DOWN` | Manual admin correction        |
| `TRANSFER`           | Between warehouses             |

Items below `Item.minStock` should surface in a low-stock alert dashboard widget.

After stock is received, if the item is saleable, a user with appropriate role must set or confirm `Item.salesPrice` before the item becomes selectable on an invoice line.

### 3.7 Invoicing

**Invoice types:** INVOICE, CREDIT_NOTE (linked to parent via `parentInvoiceId`), QUOTE (convertible to invoice).

**Invoice status lifecycle:** DRAFT → SENT → PARTIAL → PAID → CANCELLED / DELETED.

**Invoice line groups (`InvoiceLineGroup`):** The manager can group multiple line items under a named group (e.g. "Camera Installation — Ground Floor"). The `showAsSingleLine` flag controls PDF/display rendering: when `true`, the printed invoice shows only the group title and its total, hiding individual item names and quantities. The group's `subtotal`, `taxTotal`, and `total` snapshot fields must be recomputed and saved whenever group lines change (do this in the tRPC mutation, not a DB trigger).

**Invoice lines (`InvoiceLine`):** Each line references a catalogue item (optional — free-text lines are also supported via `description` with no `itemId`). Fields include quantity (Decimal for fractional hours/metres), unit price (editable, pre-filled from catalogue), discount amount, tax amount, and line total. Tax rate is stored as a FK to `TaxRate` plus a snapshot of the rate and name at time of issue (so future tax rate changes don't retroactively alter historical invoices).

**Serial number generation** must be per-org and collision-safe. Use a Prisma `$transaction` with a `SELECT ... FOR UPDATE` on a sequence counter table, or use a raw SQL sequence. Do not rely on `autoincrement()` across orgs. Fix the `@@unique([invoiceSerial])` to `@@unique([invoiceSerial, organizationId])`.

**On invoice confirmation (DRAFT → SENT):**

1. Set `dueDate` (required — defaults to `date + org.paymentTermsDays`).
2. Deduct stock for all PRODUCT lines via `StockMovement` of type `SALE_OUTBOUND`.
3. Recompute and save `subtotal`, `discountTotal`, `taxTotal`, `total` on the invoice.
4. Recompute and save group-level totals on each `InvoiceLineGroup`.
5. All inside a single `$transaction`.

**Credit notes:** A credit note references a parent invoice via `parentInvoiceId`. Issuing a credit note for returned physical goods must trigger a `RETURN_INBOUND` stock movement.

**Payments:** Recorded against an invoice via the `Payment` model. Payment methods: CASH, TRANSFER, CARD, CHEQUE, OTHER. The invoice `PaymentStatus` (separate from `InvoiceStatus`) auto-updates: if `sum(payments) >= invoice.total` → PAID; if partial → PARTIAL; if past `dueDate` and unpaid → OVERDUE. Run this check as a side effect of every payment insert and as a scheduled job for the OVERDUE case.

### 3.8 Contracts (CRM)

Contracts represent ongoing customer agreements (e.g. annual CCTV maintenance). Fields: title, description, value, currency, start/end date, renewal date, renewal alert window (`renewalAlertDays`). Contracts link to a customer. A dashboard alert surfaces contracts expiring within `renewalAlertDays`. Contracts are soft-deleted.

### 3.9 Financial statements & reports

The following reports are required:

**Accounts Receivable (AR) aging:** Outstanding invoice balances grouped by age bucket (0–30 days, 31–60, 61–90, 90+). Derived from `Invoice` and `Payment` tables filtered by `organizationId`.

**Accounts Payable (AP) aging:** Outstanding PO balances (PO total minus payments made) grouped by age.

**Revenue report:** Total invoiced revenue by period (month/quarter/year), filterable by customer or item category. Derived from confirmed invoices.

**Cost of goods:** Total purchase cost of items sold. Derived from `InvoiceLine.purchasePrice × quantity` (snapshot the purchase price at invoice time — your schema already stores this).

**Gross profit:** Revenue minus cost of goods, by period.

**Cash flow:** Sum of `Payment.amount` by date and method. The direct `organizationId` FK on `Payment` (your CHANGE 10) makes this query efficient.

**Stock valuation:** Current stock quantity × average purchase cost per item, per warehouse. Requires computing a running average cost from `StockMovement` history.

**Low-stock report:** Items where `Stock.quantity < Item.minStock`, grouped by warehouse.

---

## 4. Non-functional requirements

**Currency handling:** All monetary values are stored as `BigInt` in the smallest currency unit (fils for BHD, cents for USD). The `formatAmount`, `toSmallestUnit`, and `deformatMoney` functions in your `utils.ts` correctly implement this. Never store floats for money. BHD uses 3 decimal places (1 BHD = 1000 fils) — your `CURRENCIES.BHD.precision = 3` is correct.

**Soft deletes:** Customers, suppliers, items, categories, warehouses, and contracts all use `deletedAt`. Filter all list queries with `where: { deletedAt: null }` unless explicitly fetching archived records. Prisma middleware or a tRPC utility wrapper is the recommended place to apply this globally.

**Transactions:** Every operation that touches more than one table (PO receive, invoice confirm, stock adjustment) must use `prisma.$transaction`. Never do multi-step mutations in separate queries from a single tRPC procedure.

**Role-based access:** ADMIN can do everything within the org. USER can create and view records but cannot delete, cannot adjust stock manually, and cannot modify confirmed invoices. SUPER_ADMIN has cross-org access (platform admin only).

**Audit trail:** `StockMovement` with `userId` provides the stock audit trail. Consider adding a `createdBy` user FK to `PurchaseOrder` for the purchasing audit trail (currently missing from your schema).

**Stack constraints:** Next.js 16 App Router. tRPC v11. Prisma 5.x. Bun as runtime and package manager — do not use `npm` or `node` scripts; all scripts in `package.json` should use `bun`. shadcn/ui components only, no other UI library. PostgreSQL for production; SQLite for local dev (switch via `DATABASE_URL` env var).
