

## SCHEMA REFERENCE

The following models exist. Do not alter the schema unless explicitly instructed.

Models: Organization, User, Session, Account, Verification, Jwks, TaxRate, Customer, Supplier, SupplierItem, Category, StockItem, Warehouse, Stock, StockMovement, PurchaseOrder, PurchaseLine, PurchasePayment, Invoice, InvoiceLine, Payment, Contract.

Enums: Role (SUPER_ADMIN, ADMIN, USER), ItemType (PRODUCT, SERVICE), InvoiceType (INVOICE, CREDIT_NOTE, QUOTE), InvoiceStatus (DRAFT, SENT, PAID, PARTIAL, OVERDUE, VOID, CANCELLED), PaymentMethod (CASH, TRANSFER, CARD, CHEQUE, OTHER), PurchaseStatus (DRAFT, ORDERED, PARTIAL_RECEIVED, RECEIVED, CANCELLED), MovementType (INBOUND, OUTBOUND, TRANSFER, ADJUSTMENT, WASTAGE, RETURN).

---

## CRITICAL BUSINESS RULES

These rules must be enforced at the server layer. Never trust the client to enforce them.

### RULE 1 — Multi-tenancy isolation

Every single database query MUST include `where: { organizationId }`. Read this from the server session, never from the request body. A user must never see or modify another organization's data.

### RULE 2 — Stock quantity is write-protected

Never write to `Stock.quantity` directly from any API route. The only two places allowed to mutate stock quantity are:

- `completeInvoice()` — triggers OUTBOUND movement
- `receivePurchaseOrder()` — triggers INBOUND movement
- `createStockAdjustment()` — triggers ADJUSTMENT movement
  All three MUST use a Prisma `$transaction` that creates the StockMovement record and updates Stock.quantity atomically. If the transaction fails, neither write occurs.

### RULE 3 — Service items skip stock entirely

Before any stock operation, check `stockItem.type`. If type is `SERVICE`, skip all stock checks, Stock.quantity updates, and StockMovement creation. Services are infinite-supply.

### RULE 4 — Idempotent stock trigger

Before creating an OUTBOUND StockMovement for an invoice, check: `prisma.stockMovement.findFirst({ where: { invoiceId, type: 'OUTBOUND' } })`. If one exists, skip the trigger. This prevents double-deduction if the route is called twice.

### RULE 5 — Soft deletes

Never hard-delete StockItem, Customer, or Supplier records. Set `deletedAt = new Date()` instead. All queries on these models must include `where: { deletedAt: null }`.

### RULE 6 — Sequential document numbering

Invoice numbers (INV-2024-0001) and PO numbers (PO-2024-0001) must be generated inside a `$transaction` using `SELECT MAX` to avoid duplicates. Format: `{PREFIX}-{YYYY}-{padded 4-digit sequence}`. Sequence resets each calendar year per organization.

### RULE 7 — Monetary values are integers

All monetary values are stored as integers in the smallest currency unit (fils for BHD, cents for USD). Never store floats. Multiply by 1000 (BHD) or 100 (USD) before saving. Divide when displaying. Display function: `formatAmount(fils: number, currency: string): string`.

### RULE 8 — Tax calculation

Tax is stored as basis points. 1000 basis points = 10.00%. Calculation: `taxAmt = Math.round(unitPrice * quantity * taxRateBps / 10000)`. Always round, never floor or ceil.

---

## FILE STRUCTURE

Implement the following directory layout:



---




### 1.3 Utility functions

File: `lib/utils.ts`

Implement these functions:

```typescript
// Convert integer fils/cents to display string
// formatAmount(1500, 'BHD') → 'BD 1.500'
// formatAmount(1500, 'USD') → '$15.00'
function formatAmount(amount: number, currency: string): string;

// Convert display input to integer
// toSmallestUnit(1.5, 'BHD') → 1500
// toSmallestUnit(15.00, 'USD') → 1500
function toSmallestUnit(display: number, currency: string): number;

// Generate INV-2024-0001 style numbers
// Must be called inside a $transaction
async function generateDocNumber(
  tx: PrismaTransactionClient,
  organizationId: number,
  prefix: 'INV' | 'PO' | 'CN',
  year: number,
): Promise<string>;

// Calculate tax amount in integer
// taxBps: basis points (1000 = 10%)
function calcTax(unitPrice: number, quantity: number, taxBps: number): number;

// Calculate line total
function calcLineTotal(unitPrice: number, quantity: number, discount: number, tax: number): number;
```

---

## PHASE 2 — CATALOG (ITEMS, CATEGORIES, WAREHOUSES)

### 2.1 Item server actions

File: `server/actions/items.ts`

Implement:

```typescript
// Search items for invoice line search box
// Returns PRODUCT and SERVICE items matching name or SKU
// Excludes soft-deleted items
// Includes taxRate and category relations
export async function searchItems(query: string, orgId: number): Promise<StockItem[]>;

// Quick-create from invoice builder
// Generates a SKU: 'SVC-{timestamp}' for SERVICE, 'PRD-{timestamp}' for PRODUCT
// Returns the created item immediately
export async function quickCreateItem(
  data: {
    name: string;
    type: ItemType;
    salesPrice: number; // in display units, convert to integer inside
    taxRateId?: number;
  },
  orgId: number,
): Promise<StockItem>;

// Full create from items catalog page
export async function createItem(data: CreateItemInput, orgId: number): Promise<StockItem>;

// Update item
export async function updateItem(
  id: number,
  data: UpdateItemInput,
  orgId: number,
): Promise<StockItem>;

// Soft delete — sets deletedAt, never destroys the record
export async function softDeleteItem(id: number, orgId: number): Promise<void>;

// Get all items for catalog page with pagination and filters
export async function getItems(params: {
  orgId: number;
  type?: ItemType;
  categoryId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: StockItem[]; total: number }>;
```

### 2.2 Warehouse and stock actions

File: `server/actions/stock.ts`

```typescript
// Get stock levels for all items across warehouses
export async function getStockLevels(orgId: number, warehouseId?: number);

// Manual stock adjustment — creates ADJUSTMENT movement + updates quantity in transaction
export async function createAdjustment(
  data: {
    stockItemId: number;
    warehouseId: number;
    quantity: number; // positive or negative
    notes: string;
  },
  orgId: number,
  userId: string,
): Promise<void>;

// Transfer stock between warehouses — creates TRANSFER movement
export async function transferStock(
  data: {
    stockItemId: number;
    fromWarehouseId: number;
    toWarehouseId: number;
    quantity: number;
  },
  orgId: number,
  userId: string,
): Promise<void>;

// Internal — called by invoice and PO actions only. Not exported to API routes.
// Always use inside a $transaction
async function _createMovementAndUpdateStock(
  tx: PrismaTransactionClient,
  data: {
    type: MovementType;
    stockItemId: number;
    quantity: number;
    fromWarehouseId?: number;
    toWarehouseId?: number;
    invoiceId?: number;
    purchaseId?: number;
    organizationId: number;
    userId: string;
    notes?: string;
  },
): Promise<void>;
```

---

## PHASE 3 — BUY SIDE (SUPPLIERS, PURCHASE ORDERS)

### 3.1 Purchase order actions

File: `server/actions/purchase-orders.ts`

```typescript
export async function createPurchaseOrder(
  data: {
    supplierId: number;
    lines: Array<{ stockItemId: number; quantity: number; unitCost: number }>;
    notes?: string;
    expectedDate?: Date;
  },
  orgId: number,
): Promise<PurchaseOrder>;
// Inside: generate PO number, calculate totals, create PO + lines in transaction

export async function receivePurchaseOrder(
  poId: number,
  orgId: number,
  userId: string,
): Promise<void>;
// Steps (all inside one $transaction):
// 1. Fetch PO with lines and their stockItems
// 2. Verify PO.organizationId === orgId
// 3. Verify PO.isReceived === false (idempotency guard)
// 4. For each PurchaseLine where stockItem.type === PRODUCT:
//    a. Upsert Stock (create if not exists, increment quantity)
//    b. Call _createMovementAndUpdateStock with type=INBOUND
// 5. Set PO.isReceived = true, PO.receivedAt = now, PO.status = RECEIVED

export async function addPurchasePayment(
  data: {
    purchaseOrderId: number;
    amount: number;
    method: PaymentMethod;
    reference?: string;
  },
  orgId: number,
): Promise<void>;
// After adding payment, recalculate PO payment status
```

---

## PHASE 4 — SELL SIDE (INVOICES, PAYMENTS)

### 4.1 Invoice server actions

File: `server/actions/invoices.ts`

This is the most critical file. Implement precisely.

```typescript
// Create a new invoice in DRAFT status
export async function createInvoice(
  data: {
    customerId?: number;
    warehouseId?: number;
    description?: string;
    dueDate?: Date;
  },
  orgId: number,
  userId: string,
): Promise<Invoice>;
// Steps:
// 1. Generate invoice number using generateDocNumber inside $transaction
// 2. Set dueDate = now + org.paymentTermsDays if not provided
// 3. Create Invoice with status=DRAFT, type=INVOICE

// Add or update a line on an invoice
export async function upsertInvoiceLine(
  data: {
    invoiceId: number;
    lineId?: number; // if provided, update; otherwise create
    stockItemId?: number;
    description?: string;
    quantity: number;
    unitPrice: number; // in smallest currency unit
    taxRateId?: number;
    discountAmt?: number;
    sortOrder?: number;
  },
  orgId: number,
): Promise<InvoiceLine>;
// Steps:
// 1. Verify invoice belongs to orgId
// 2. Verify invoice.status === DRAFT (cannot edit sent/paid invoices)
// 3. Fetch taxRate.rate if taxRateId provided
// 4. Calculate: taxAmt = calcTax(unitPrice, quantity, taxRate)
// 5. Calculate: total = calcLineTotal(unitPrice, quantity, discountAmt, taxAmt)
// 6. Upsert the line
// 7. Call recalculateInvoiceTotals(invoiceId, tx)

// Recalculate and update invoice subtotal/taxTotal/discountTotal/total
// Must be called after any line change
async function recalculateInvoiceTotals(
  invoiceId: number,
  tx: PrismaTransactionClient,
): Promise<void>;
// SUM all lines: subtotal = sum(unitPrice*qty), discountTotal = sum(discountAmt), taxTotal = sum(taxAmt), total = sum(total)

// Delete a line from a draft invoice
export async function deleteInvoiceLine(lineId: number, orgId: number): Promise<void>;

// Update invoice status — this is the main status machine
export async function updateInvoiceStatus(
  invoiceId: number,
  newStatus: InvoiceStatus,
  orgId: number,
  userId: string,
): Promise<void>;
// Allowed transitions:
//   DRAFT → SENT, VOID
//   SENT → PAID, PARTIAL, OVERDUE, VOID
//   PARTIAL → PAID, OVERDUE, VOID
//   OVERDUE → PAID, VOID
// On transition to PAID or manually triggered completion:
//   Call triggerOutboundMovements(invoiceId, orgId, userId)

// Trigger stock deduction — called when invoice is paid/completed
// Safe to call multiple times due to idempotency guard
async function triggerOutboundMovements(
  invoiceId: number,
  orgId: number,
  userId: string,
): Promise<void>;
// Steps (inside $transaction):
// 1. Check: if any StockMovement WHERE invoiceId AND type=OUTBOUND exists → return early
// 2. Fetch invoice with lines and their stockItems
// 3. For each line where stockItem.type === PRODUCT:
//    a. Fetch Stock for (stockItemId, invoice.warehouseId)
//    b. Verify Stock.quantity >= line.quantity — throw error if insufficient
//    c. Call _createMovementAndUpdateStock with type=OUTBOUND, quantity=-line.quantity

// Add payment to invoice
export async function addPayment(
  data: {
    invoiceId: number;
    amount: number; // in smallest currency unit
    method: PaymentMethod;
    date?: Date;
    reference?: string;
    notes?: string;
  },
  orgId: number,
): Promise<Payment>;
// Steps:
// 1. Verify invoice belongs to orgId
// 2. Create Payment record
// 3. Sum all payments: if >= invoice.total → updateInvoiceStatus(PAID)
//    else if > 0 → updateInvoiceStatus(PARTIAL)

// Issue a credit note against a paid invoice
export async function issueCreditNote(
  parentInvoiceId: number,
  orgId: number,
  userId: string,
): Promise<Invoice>;
// Steps:
// 1. Fetch parent invoice with lines
// 2. Generate CN number using generateDocNumber with prefix 'CN'
// 3. Create new Invoice with type=CREDIT_NOTE, parentInvoiceId=parentInvoiceId
// 4. Clone all lines with negated totals
// 5. Set CN status to PAID immediately
// 6. Trigger RETURN StockMovements for PRODUCT lines (positive quantity back to stock)
```

---

## PHASE 5 — INVOICE BUILDER UI

This is the most important UI component. Implement as a client component.

File: `components/invoice/InvoiceBuilder.tsx`

### State structure

```typescript
interface InvoiceBuilderState {
  invoiceId: number;
  status: InvoiceStatus;
  customerId: number | null;
  warehouseId: number | null;
  lines: InvoiceLine[];
  totals: { subtotal: number; taxTotal: number; discountTotal: number; total: number };
  currency: string;
}
```

### Line item search component

File: `components/invoice/LineItemSearch.tsx`

This is a combobox/search input that appears when the user clicks "Add item" on the invoice.

Behavior:

1. User types a search query (debounced 300ms)
2. Call `searchItems(query, orgId)` — returns matching StockItems
3. Display results in a dropdown grouped into two sections: "Products" and "Services"
4. Each result shows: name, SKU, sales price formatted
5. At the bottom of the dropdown, always show two "create" options:
   - `+ Add "{query}" as a product`
   - `+ Add "{query}" as a service`

When user selects an existing item:

- Call `upsertInvoiceLine({ invoiceId, stockItemId, quantity: 1, unitPrice: item.salesPrice, taxRateId: item.taxRateId })`
- Close dropdown, add line to local state

When user clicks "Add as product" or "Add as service":

- Open `QuickCreateModal` pre-filled with the search query and type
- On modal submit: call `quickCreateItem(...)` then immediately `upsertInvoiceLine(...)`
- Close modal, add line to local state

### Quick create modal

File: `components/items/QuickCreateModal.tsx`

Fields:

- Name (pre-filled from search query)
- Type: PRODUCT / SERVICE (pre-selected)
- Sales price (number input, display units)
- Tax rate (select from org's TaxRate list)
- Unit (text, defaults to "pcs" for PRODUCT, "hr" for SERVICE)

On submit: call `quickCreateItem`, return the created item to parent.

### Line editing

Each InvoiceLine row in the builder must allow inline editing of:

- Description (overrides item name)
- Quantity (number input, minimum 1)
- Unit price (number input, display units)
- Tax rate (select)
- Discount amount

On any change: call `upsertInvoiceLine` with the updated values. Recalculate line total client-side instantly for responsiveness, then confirm with server response.

### Totals panel

File: `components/invoice/LineTotals.tsx`

Display (all formatted using `formatAmount`):

- Subtotal
- Discount (if any, shown in red)
- Tax (grouped by tax rate name)
- Total (large, bold)

Recalculate client-side on every line change. Persist to server on save.

---

## PHASE 6 — DASHBOARD AND REPORTS

File: `server/actions/dashboard.ts`

```typescript
export async function getKPIs(orgId: number, period: 'month' | 'quarter' | 'year') {
  // Return:
  // - totalRevenue: SUM(Invoice.total) WHERE status=PAID AND date in period
  // - totalOutstanding: SUM(Invoice.total - payments) WHERE status IN [SENT, PARTIAL, OVERDUE]
  // - invoiceCount: COUNT invoices in period
  // - overdueCount: COUNT WHERE status=OVERDUE
  // - lowStockCount: COUNT Stock WHERE quantity <= StockItem.reorderPoint
  // - expiringContractsCount: COUNT WHERE endDate <= now + renewalAlertDays AND isActive=true
}

export async function getARAgingReport(orgId: number) {
  // Group unpaid invoices by days overdue buckets:
  // Current (not yet due), 1-30 days, 31-60 days, 61-90 days, 90+ days
  // Return each bucket: count, total amount
}

export async function getStockAlerts(orgId: number) {
  // Items where Stock.quantity <= StockItem.reorderPoint
  // Include: item name, current quantity, reorderPoint, warehouse name
}
```

---

## PHASE 7 — VALIDATION SCHEMAS

File: `lib/validations/invoice.ts`

Define Zod schemas that are shared between client forms and server actions:

```typescript
export const createInvoiceLineSchema = z.object({
  stockItemId: z.number().int().positive().optional(),
  description: z.string().max(500).optional(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().int().min(0), // in smallest unit
  taxRateId: z.number().int().positive().optional(),
  discountAmt: z.number().int().min(0).default(0),
  sortOrder: z.number().int().default(0),
});

export const quickCreateItemSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.nativeEnum(ItemType),
  salesPrice: z.number().min(0), // display units — convert in action
  taxRateId: z.number().int().positive().optional(),
  unit: z.string().max(20).default('pcs'),
});

export const addPaymentSchema = z.object({
  invoiceId: z.number().int().positive(),
  amount: z.number().int().positive(),
  method: z.nativeEnum(PaymentMethod),
  date: z.date().optional(),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});
```

---

## PHASE 8 — API ROUTES

Use Next.js Server Actions (not route handlers) for all mutations. For queries used in React Query, use Server Actions marked `'use server'`.

Pattern for every server action:

```typescript
'use server';

export async function exampleAction(input: unknown) {
  // 1. Get session
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  const { organizationId, user } = session;

  // 2. Validate input
  const data = exampleSchema.parse(input);

  // 3. Execute with org scope
  return prisma.example.create({
    data: { ...data, organizationId },
  });
}
```

---

## PHASE 9 — REACT QUERY WRAPPERS

File: `lib/queries/invoices.ts`

Wrap server actions in React Query hooks for client components:

```typescript
// List invoices with filters
export function useInvoices(filters: InvoiceFilters) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => getInvoices(filters),
    staleTime: 30_000,
  });
}

// Invoice builder — optimistic line updates
export function useAddInvoiceLine(invoiceId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertLineInput) => upsertInvoiceLine({ ...data, invoiceId }),
    onMutate: async (newLine) => {
      // Optimistic update: immediately add line to local cache
      await queryClient.cancelQueries({ queryKey: ['invoice', invoiceId] });
      const previous = queryClient.getQueryData(['invoice', invoiceId]);
      queryClient.setQueryData(['invoice', invoiceId], (old: Invoice) => ({
        ...old,
        lines: [...old.lines, { ...newLine, id: -Date.now() }], // temp id
      }));
      return { previous };
    },
    onError: (err, _, context) => {
      // Roll back on error
      queryClient.setQueryData(['invoice', invoiceId], context?.previous);
    },
    onSettled: () => {
      // Always refetch to sync real server state
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    },
  });
}

// Item search — short stale time for fresh results
export function useItemSearch(query: string) {
  return useQuery({
    queryKey: ['items', 'search', query],
    queryFn: () => searchItems(query),
    staleTime: 10_000,
    enabled: query.length >= 1,
  });
}
```

---

## PHASE 10 — INVOICE PDF

File: `components/invoice/InvoicePDF.tsx`

Use `@react-pdf/renderer` or generate via a `/api/invoices/[id]/pdf` route using Puppeteer/html-pdf.

The PDF must include:

- Organization logo, name, address, taxId
- Invoice number, date, due date
- Customer name, address, taxId
- Line items table: description, qty, unit price, tax%, total
- Subtotal, discount, tax breakdown, grand total
- Payment terms text
- "Amount paid" and "Balance due" if partially paid
- Footer with organization website and generated timestamp

Store currency formatting using `formatAmount()`.

---

## ERROR HANDLING PATTERNS

Use a consistent error pattern across all server actions:

```typescript
// Custom error types
class AppError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

// Usage in actions
if (stock.quantity < line.quantity) {
  throw new AppError(
    'INSUFFICIENT_STOCK',
    `Not enough stock for "${item.name}". Available: ${stock.quantity}, requested: ${line.quantity}`,
  );
}
```

In the UI, catch `AppError` and display the message in a toast notification. For unknown errors, show a generic "Something went wrong" message and log to console.

---

## ENVIRONMENT VARIABLES

Required in `.env`:

```
DATABASE_URL="file:./dev.db"
BETTER_AUTH_SECRET="<generate with: openssl rand -base64 32>"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Optional for production:

```
DATABASE_URL="postgresql://..."
```

---

## IMPLEMENTATION ORDER

Build in this exact sequence to avoid blocked dependencies:

1. `lib/prisma.ts` — database client
2. `lib/auth.ts` — authentication
3. `lib/utils.ts` — shared utilities (formatAmount, calcTax, generateDocNumber)
4. `lib/validations/*.ts` — Zod schemas
5. `server/actions/items.ts` — catalog foundation
6. `server/actions/stock.ts` — stock movement engine (including internal `_createMovementAndUpdateStock`)
7. `server/actions/customers.ts`, `server/actions/suppliers.ts`
8. `server/actions/purchase-orders.ts` — buy side
9. `server/actions/invoices.ts` — sell side (depends on stock actions)
10. `components/invoice/LineItemSearch.tsx` — item search combobox
11. `components/items/QuickCreateModal.tsx`
12. `components/invoice/InvoiceBuilder.tsx` — assembles the above
13. All page files — wire up server actions to UI
14. `server/actions/dashboard.ts` — aggregate queries last
15. PDF generation

---

## TESTING CHECKLIST

After implementation, verify these scenarios manually:

- [ ] Create a SERVICE item inline from invoice → no stock movement created
- [ ] Create a PRODUCT item inline from invoice → stock movement created on completion
- [ ] Complete same invoice twice → only one OUTBOUND movement exists (idempotency)
- [ ] Add partial payment → status becomes PARTIAL
- [ ] Add remaining payment → status becomes PAID, stock deducted
- [ ] Receive a purchase order → INBOUND movement created, Stock.quantity incremented
- [ ] Issue credit note → RETURN movement created, stock restored
- [ ] Two users in different orgs cannot see each other's invoices
- [ ] Invoice number sequence: INV-2024-0001, INV-2024-0002, no gaps, no duplicates
- [ ] BHD amount 1.500 stored as integer 1500, displayed as "BD 1.500"

---

## NOTES FOR AI IMPLEMENTATION

- Never implement stock writes outside of the `$transaction` pattern
- The `organizationId` must come from `getSession()` server-side — never from request body
- All amounts entering the system from forms are in display units (decimal). Convert to integer immediately in the server action before any calculation or storage
- The invoice builder must feel instantaneous — use optimistic updates for line adds
- The `LineItemSearch` component is the UX centrepiece. It must handle the full create-on-the-fly flow without navigating away from the invoice
- Do not add extra models or fields to the schema — work within what exists
- All list pages should support search, filter, and pagination server-side
