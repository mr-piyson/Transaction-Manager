# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: a small-business owner or manager who runs their business's day-to-day operations in one place — creating invoices, tracking stock, managing purchases and expenses, and keeping their books — without needing to hire accountants or bookkeeping specialists.

Securing a second audience — specialist roles (sales, purchasing, warehouse, finance) within a single company each using the module they need over shared data — is an open decision, not yet confirmed.

## Product Purpose

Transaction Manager helps a small business see and control its money and stock in one tool. It lets users create Records for customers, suppliers, items, and documents (invoices and quotations), then manage Transactions against them — purchases, sales, receipts/payments, stock movements, expenses, incomes, and journal entries — and close out with accounting reports. Success means an owner can run invoicing, inventory, purchasing, expenses, and double-entry accounting from one app and trust the numbers at the end of the month.

## Positioning

All-in-one simplicity: one application that covers invoicing, stock, purchases, expenses, and double-entry accounting together, without module-switching, heavy configuration, or specialist accounting knowledge. The claim is the bundling itself — a neighboring single-purpose or heavyweight modular ERP could not truthfully copy a product that is complete yet simple enough for one owner to operate alone.

## Operating Context

Users work in a browser across a responsive web app. Core operating modules (under the ERP area): customers, suppliers, items, warehouses, stock (with adjustments and movements), documents (invoices and quotations), purchase orders, expenses, incomes, contracts, and subscriptions; accounting covers chart of accounts, journal entries, tax/exchange rates, and reports (trial balance, general ledger, profit & loss, balance sheet, AP/AR aging, items). Supporting surfaces: dashboard, notifications, and settings (organization, users, permissions, roles, subscription, appearance, categories, units, tax rates, sessions, date-time, financial, adjustment reasons, chart of accounts).

## Capabilities and Constraints

- Full Arabic + English localization (next-intl), including RTL/LTR layout across every surface.
- Role- and permission-based access (CASL) governing what each user can see and do within their organization.
- Multi-tenant data model: records are scoped to an Organization.
- Double-entry accounting: ledger accounts, journal entries/lines, approval workflows, and financial reports.
- Document generation: invoices, quotations, receipts; PDF export and barcode rendering.
- Stock management with warehouses, adjustments, movements, and reason codes.
- Seed/demo data is used today; real customer financial data is an environment decision currently open.
- Multi-module breadth (CRM, HRMS schemas also present in the data layer) is present but the shipping surface is the ERP/operations module.
- Existing brand commitment: the name "Transaction Manager" and its logo/banners are assets to preserve.

## Brand Commitments

The product name "Transaction Manager" and its existing logo and banner asset (light/dark variants) are committed and must be preserved. Voice is not yet formally pinned but should stay plain, trustworthy, and business-first rather than promotional.

## Evidence on Hand

- README.md and app copy describe the product and its positioning.
- prisma/schema.prisma (plus hrms.prisma and crm.prisma) encodes the full data model: organizations, users, roles/permissions, customers, suppliers, items, warehouses, stock, documents, purchase orders, payments, contracts, expenses, incomes, subscriptions, ledger accounts, journal entries, approval workflows, notifications, audit log.
- assets/ holds brand banners; no customer testimonials, case studies, pricing pages, press, or benchmark data exist — future work must not fabricate these.

## Product Principles

1. Owner can run it alone — every action must be discoverable and safe for a non-specialist; accounting complexity stays behind simple, guided workflows.
2. One source of truth across money and stock — transactional integrity between invoicing, inventory, purchases, and the ledger is non-negotiable.
3. Bilingual by default — Arabic and English are first-class in every surface, not a bolt-on; RTL/LTR correctness is part of correctness.
4. Trust through control — roles, permissions, approval flows, and an audit trail exist to reassure owners; the UI should surface rather than hide them.
5. Fast at the point of work — the heavy modules (invoices, stock, entries, reports) must stay quick and scannable for daily use.

## Accessibility & Inclusion

- RTL/LTR support for the two shipping languages is a hard requirement.
- No broader accessibility standard has been established yet; treat keyboard navigation, focus states, contrast, and screen-reader semantics as baseline expectations during implementation, and confirm with the user before claiming a specific conformance level.
