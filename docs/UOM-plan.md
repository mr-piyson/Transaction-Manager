# Task: Multi-Unit of Measure (UoM) for `transaction-manager`

You are working in `transaction-manager`: Next.js 16 (App Router), React 19, tRPC v11, Prisma 7 (`prisma-client-js`, PostgreSQL, multi-schema `public/hrms/crm`), better-auth, CASL, next-intl, Zod 4, Biome, Bun.

**Work in phases. Do not skip Phase 0. Stop and ask me at every point marked `ASK ME`.**

---

## 0. Goal

Let an item be **stocked in one Base Unit** (e.g. Meter) but **bought and sold in other units** (e.g. Box = 305 m, Spool = 100 m), with correct stock, cost, price, totals, and audit trail.

Example: Ethernet cable. Base = Meter. Purchase 2 Boxes @ 152.500 BHD/box → stock +610 m at 0.500 BHD/m. Sell 3 m @ 0.900 → stock −3 m.

## 1. Facts about my current schema (already inspected — verify against the real code)

- `Unit` is a plain label: `name`, `code`, `isActive`, `isDefault`, `deletedAt`, `organizationId`. `@@unique([code, organizationId])`. No conversion data.
- `Item` has **both** a legacy `unit String @default("pcs")` **and** `unitId → Unit (unitRef)`. `minStock`, `reorderPoint`, `reorderQty` are `Int`. `averageCost` and `salesPrice` are `Decimal(20,6)`.
- `Stock.quantity` `Decimal(14,4)`, unique `[itemId, warehouseId]`, has optimistic-lock `version`.
- `StockMovement.quantity` `Decimal(14,4)` (signed), `unitCost Decimal(20,6)?`, links to `invoiceLineId` / `purchaseLineId`. Types include `PURCHASE_INBOUND`, `SALE_OUTBOUND`, `RETURN_INBOUND`, `RETURN_OUTBOUND`, `ADJUSTMENT_UP/DOWN`, `DAMAGE`, `TRANSFER_IN/OUT`, `OPENING_BALANCE`, `ASSEMBLY_CONSUME/PRODUCE`.
- `InvoiceLine`: `quantity`, `unitPrice`, `purchasePrice` (cost snapshot), `discountPct`, `discountAmt`, `taxAmt`, `total`, `itemId?`. No unit field. `Invoice.type` includes `QUOTE`, `INVOICE`, `CREDIT_NOTE`, `PROFORMA`, `DELIVERY_NOTE`; has `warehouseId?`, `parentInvoiceId` (credit notes), `convertedFromId` (quote → invoice).
- `PurchaseLine`: `quantity`, `receivedQty`, `unitCost`, `taxAmt`, `total`, `itemId?` (null = manual line, never touches stock). `PurchaseOrder.warehouseId` required. Statuses: `DRAFT … ORDERED, PARTIAL_RECEIVED, RECEIVED, INVOICED …`.
- Other quantity/price-bearing models: `PriceListLine` (`unitPrice`, `minQty`), `SupplierItem` (`basePrice`, `minOrderQty`), `BundleLine` (`quantity`), `Expense.itemId?`.
- There is a `Kiosk` model (probably a POS/sales entry point) — must be covered.
- Schema is applied with `bun run sync` = `prisma generate && prisma db push`. **There are no Prisma migrations**, so data backfill must be an explicit script.
- No test runner is in `package.json`. Use `bun test` (built-in) for unit tests; do not add Jest/Vitest.

## 2. Non-negotiable rules

1. **Base Unit is the single source of truth for inventory.** `Stock.quantity`, `StockMovement.quantity`, `StockMovement.unitCost`, `Item.averageCost`, `minStock/reorderPoint/reorderQty` are **always** in the item's Base Unit.
2. **Document lines store what the user typed** (`quantity`, `unitPrice`/`unitCost` in the selected unit) **plus** snapshotted base values. Existing totals/tax/discount math keeps operating on the selected-unit `quantity × price`, so it does not change.
3. **Snapshot the conversion factor on every line** (`uomFactor`). Editing a conversion later must never change historical documents or re-value stock.
4. All arithmetic uses `Decimal`, never JS floats. Use `Prisma.Decimal` (import from the path the repo already uses — verify; the `@prisma/client/runtime/library` path from an earlier draft may not exist in Prisma 7). For client components, find out how money math is done today and follow that; do not add a new decimal library without asking.
5. Conversion happens **server-side** in the tRPC layer. Never trust `baseQuantity` / `uomFactor` sent by the client — recompute from the DB.
6. Everything is scoped by `organizationId`; respect soft-delete (`deletedAt`), CASL permissions, `AuditLog`, and `next-intl` (no hard-coded UI strings).
7. Fully backward compatible: an item with no alternative units behaves exactly as today.

## 3. Design decisions (these intentionally differ from the earlier draft — explain if you disagree)

### 3.1 Conversion is **per item**, not on the global `Unit`
The earlier draft put `conversionFactor` / `baseUnitId` on `Unit`. That breaks because "Box" means 305 m for cable but 100 pcs for screws. Keep `Unit` as a label and add a per-item table:

```prisma
model ItemUom {
  id             String   @id @default(cuid())
  itemId         String
  item           Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  unitId         String
  unit           Unit     @relation(fields: [unitId], references: [id])

  // 1 of this unit = `factor` Base Units of the item. Must be > 0.
  factor         Decimal  @db.Decimal(18, 6)

  isPurchaseDefault Boolean @default(false)
  isSalesDefault    Boolean @default(false)
  barcode        String?  // optional: scan a box barcode
  isActive       Boolean  @default(true)
  deletedAt      DateTime?

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([itemId, unitId])
  @@index([organizationId])
  @@index([itemId])
  @@schema("public")
}
```

- The Base Unit is `Item.unitId` with implicit factor 1 (no `ItemUom` row needed, but expose it in the API as a virtual row).
- Enforce in the service layer: factor > 0; alt unit ≠ base unit; at most one purchase default and one sales default per item; the base unit may also be a default (null default = base).
- **Locking rule:** once an item has any stock movement or document line, its Base Unit can't be changed, and an `ItemUom.factor` can't be edited — only deactivated and replaced. (Lines are protected by the snapshot, but this keeps the catalogue understandable.)

### 3.2 New columns on document lines
Add to **`PurchaseLine`** and **`InvoiceLine`** (nullable / defaulted so `db push` is non-destructive):

```prisma
unitId       String?
unit         Unit?    @relation(fields: [unitId], references: [id])
uomFactor    Decimal  @default(1) @db.Decimal(18, 6)   // snapshot
baseQuantity Decimal  @default(0) @db.Decimal(14, 4)   // quantity × uomFactor
// PurchaseLine: baseUnitCost  = unitCost / uomFactor
// InvoiceLine : baseUnitPrice = unitPrice / uomFactor
```

Add the reverse relations on `Unit`. Keep `PurchaseLine.receivedQty` in the **selected unit** (so it stays comparable with `quantity`); when receiving `delta` selected-units, write `StockMovement.quantity = delta × uomFactor` (base). ASK ME if you think a separate `receivedBaseQty` is cleaner.

`InvoiceLine.purchasePrice` (cost snapshot) must be expressed **per selected unit** = `Item.averageCost × uomFactor`, so line margin (`unitPrice − purchasePrice`) stays apples-to-apples.

### 3.3 Rounding
Base unit cost can be non-terminating (e.g. 100 ÷ 3). Rules:
- Compute `baseUnitCost` at full `Decimal` precision, store at 6 dp.
- Prefer **`line total ÷ baseQuantity`** when deriving cost for average-cost updates, so rounding never leaks value.
- Put all rounding in one helper in `src/lib/uom-converter.ts` and unit-test it.

### 3.4 Other models — proposed defaults (ASK ME to confirm)
- `PriceListLine.unitPrice` / `minQty`: **stay in the item's Base Unit**; selected-unit price = base price × factor. (Alternative: add `unitId` to `PriceListLine`.)
- `SupplierItem.basePrice` / `minOrderQty`: **in the item's default purchase unit** if one exists, else Base Unit. (Needs a decision.)
- `BundleLine.quantity`: in the component's Base Unit.
- Stock adjustments, transfers, opening balance, damage, assembly: **Base Unit only** in phase 1 (optionally show an "≈ 2.00 Box" hint).
- `Item.minStock / reorderPoint / reorderQty` (Int): Base Unit. Flag if fractional base units make `Int` a problem.

## 4. Phased plan

### Phase 0 — Discovery (read-only, no edits). Report back before coding.
Find and summarise, with file paths:
1. Every tRPC router/procedure and service that reads or writes `PurchaseLine`, `InvoiceLine`, `Stock`, `StockMovement`, `Item.averageCost` (PO create/update/receive/cancel, invoice create/update/confirm/cancel, credit notes, quote → invoice conversion, kiosk sales, transfers, adjustments, assembly, opening balance).
2. **Exactly when** stock is deducted on sale (which `InvoiceStatus` / `InvoiceType`) and reversed on cancel / credit note / delete.
3. Where and how `averageCost` is recalculated (weighted average? on receive? on invoice?) and how `Invoice.purchasePrice` is set.
4. The PO form, invoice form, quote form and kiosk UI: which form lib (`react-hook-form` vs `@tanstack/react-form`), which grid (plain table, TanStack Table, AG Grid), how line totals are computed, and how the item picker works.
5. Item create/edit UI and Unit management UI/routers.
6. Every other consumer of `quantity`/`unitPrice`: reports, dashboard, XLSX/PDF exports (`xlsx`, `jspdf`, `pdf-lib`), print templates, barcode labels, notifications (low stock), CSV import.
7. Any use of the legacy `Item.unit` string vs `Item.unitId`.
8. Existing test setup and conventions (Zod schemas, error handling, audit logging, CASL subjects).

Then **ASK ME** any question the code raises, plus the open questions in §6.

### Phase 1 — Schema
- Add `ItemUom`, line columns, and reverse relations exactly as in §3.
- Do **not** change `Unit`'s existing fields.
- Write `scripts/backfill-uom.ts` (idempotent, batched, runnable with `bun`): for every existing `PurchaseLine` / `InvoiceLine` set `unitId = item.unitId`, `uomFactor = 1`, `baseQuantity = quantity`, `baseUnitCost/Price = unitCost/unitPrice`.
- Also backfill `Item.unitId` from the legacy `Item.unit` string where `unitId` is null (create missing `Unit` rows per org). ASK ME before doing this part.
- Remind me to run `bun run backup` before `bun run sync`.

### Phase 2 — Pure conversion library + tests
Create `src/lib/uom-converter.ts` (pure, no DB, no React) with:
`convertToBase(qty, factor)`, `baseUnitAmount(pricePerSelected, factor)`, `fromBase(baseQty, factor)`, `formatQtyWithUom(baseQty, baseUnit, altUnit?)`, `resolveUomFactor(item, unitId)` (returns 1 for the base unit, factor for an `ItemUom`, throws for a unit not allowed on that item).
Write `bun test` cases: 1 Box → 305 m; 152.5/305; 100/3 rounding; zero/negative factor rejected; fractional quantities (0.5 Box); big values; base unit passthrough.

### Phase 3 — Backend
- **Item/Unit routers:** CRUD for `ItemUom` (with the locking rule and validations), included in item `get`/`list` so the forms can render the unit dropdown without extra round-trips. CASL + audit log on every change.
- **Purchase orders:** on line create/update, load the item and its `ItemUom`, validate the unit, snapshot `uomFactor`, compute `baseQuantity` / `baseUnitCost`. On receive, write `StockMovement` (base qty, base unit cost), update `Stock` respecting the `version` lock, update `averageCost` per the existing method using **base** values. Manual lines (`itemId = null`) stay untouched.
- **Invoices / quotes / credit notes / kiosk:** compute the same snapshots; stock check compares `Stock.quantity` to `baseQuantity`; deduct/restore in base units; quote → invoice conversion copies `unitId` and `uomFactor`; credit-note returns restore base quantity via `uomFactor` of the original line.
- **Price list resolution:** resolve price for the selected unit per §3.4.
- Update reports, exports, low-stock alerts, and print templates found in Phase 0 so they show the selected unit on documents and base units in inventory reports.

### Phase 4 — UI
1. **Item form:** new "Units of measure" section: base unit (locked once used), table of alternative units (unit, factor, purchase-default, sales-default, barcode), live preview "1 Box = 305 m".
2. **PO / Invoice / Quote / Kiosk line rows:** a unit `Select` per line, defaulting to the item's purchase/sales default. On unit change: recompute the suggested price (price × factor ratio), keep the quantity, recompute totals. Helper text under the row: `1 Box = 305 m · 0.500 / m`. Show base quantity when the unit ≠ base.
3. **Stock availability** on sales lines: primary `Available: 610 m`, secondary `≈ 2.00 Box`. Block or warn when `baseQuantity` exceeds stock (follow the existing over-sell policy).
4. **Receiving screen:** receive in the line's unit, show resulting base quantity.
5. **Read-only views / PDFs / exports:** show quantity with its unit code.
6. Follow the existing design system (Shadcn/Base UI components, Tailwind 4), keep keyboard flow in line-entry, all strings through `next-intl`.

### Phase 5 — Verification
- `bun test` for the converter and any pure service helpers.
- `bun run lint` (Biome) and `tsc --noEmit` clean.
- Manual scenario script (write it in the PR description): cable example end-to-end — receive 2 Box, sell 3 m, sell 1 Box, credit-note 1 m, cancel a PO line, edit an `ItemUom` after use (must be blocked), item with no alt units (unchanged behaviour).
- Confirm stock ledger sum = `Stock.quantity` for the test item, and `averageCost` matches hand calculation.

## 5. Output format for every phase
1. List of files changed/created with one-line reasons.
2. Anything you were unsure about, as questions.
3. Exact commands I need to run (`bun run backup`, `bun run sync`, backfill script, tests).
Do not proceed to the next phase until I say so.

## 6. Open questions — ASK ME (with my current lean)

1. Should a unit like "Box" ever have **different factors for different items**? *(Assumed yes → per-item `ItemUom`.)*
2. Do you sell **fractional** base units (cut cable 3.5 m)? Should some items forbid fractions? *(Assumed allowed; may add `allowFractions` on `Item`.)*
3. Is a unit dropdown needed on **quotes, proforma, delivery notes and kiosk**, or only PO + invoice? *(Assumed all invoice types.)*
4. Should **price lists** be per selected unit or derived from base price? *(Assumed derived.)*
5. Should **stock adjustments/transfers** accept alt units in phase 1? *(Assumed no.)*
6. Is purchasing ever done in a unit **without** a fixed ratio (e.g. "Roll" of varying length)? If yes, that needs a per-line manual base quantity instead. *(Assumed no.)*
7. Same for **multi-currency** POs: any existing per-line currency handling that touches `unitCost`?
8. OK to migrate the legacy `Item.unit` string into `unitId`, and later drop it?