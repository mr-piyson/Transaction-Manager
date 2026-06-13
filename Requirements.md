# Software Requirements Specification (SRS)

## Project: Transaction Manager (Enterprise ERP System)

**Document Version:** 1.0.0  
**Date:** June 13, 2026  
**Status:** Draft / Proposed

---

## 1. Project Overview & Vision

### 1.1 Introduction

**Transaction Manager** is an enterprise-grade Enterprise Resource Planning (ERP) subsystem designed to streamline and centralize core operational workflows including item provisioning, real-time inventory adjustments, multi-state invoicing, and precise financial audit tracking.

The application serves as a single source of truth for organizational data, bridging the gap between physical supply chain activities (stock management) and back-office financial reconciliation (invoicing and billing).

### 1.2 Core Vision

To eliminate manual overhead, minimize data discrepancies across ledger updates, and maximize operational throughput by introducing automated status state-machines, robust item categorization matrices, and rigorous, high-precision financial tracking.

---

## 2. Problem Statement

Modern enterprise ecosystems frequently struggle with fragmented data management caused by legacy tools, manual spreadsheet trackers, or disconnected business units. The key problems **Transaction Manager** resolves include:

1. **Financial Discrepancies & Rounding Errors:** Using standard floating-point numbers instead of exact arbitrary-precision representations causes minute errors that aggregate over thousands of invoices, resulting in massive compliance and auditing bottlenecks.

2. **Desynchronized Stock & Invoicing:** Inventory counts often lag behind actual sales transactions. Items are sold when physically out of stock, or invoices are drawn up against missing or mispriced inventory.

3. **Opaque Invoice Lifecycles:** Disjointed tracking systems fail to provide real-time updates on whether an invoice is a temporary draft, sent to a vendor, partially paid, fully settled, or critically overdue. This degrades cash flow predictability.

4. **Lack of Definitive Audit Trails:** When stock anomalies or financial variances occur, identifying who modified a record, when, and why is nearly impossible without granular immutable logs.

---

## 3. Target Audience & User Personas

The system enforces strict **Role-Based Access Control (RBAC)** tailored to the following distinct internal roles:

### 3.1 Inventory Manager (Stock Specialist)

- **Objective:** Ensures item accuracy, tracks physical stock volumes, handles stock-ins/adjustments, and minimizes stockouts.
- **Pain Points:** Lack of real-time visibility into quantities reserved for pending invoices, cumbersome manual stock adjustments, and missing alerts for critically low stock thresholds.

### 3.2 Billing / Accounts Receivable Officer

- **Objective:** Generates accurate invoices, manages line-item details, tracks collection statuses, and coordinates client reminders.
- **Pain Points:** Manually validating line item totals against current stock prices, correcting faulty tax/discount computations, and losing track of partially paid bills.

### 3.3 Procurement / Operations Executive

- **Objective:** Reviews system trends to determine necessary asset reorders and tracks internal item movements across departments.
- **Pain Points:** Inconsistent item codes, unmapped suppliers, and disjointed procurement logging.

### 3.4 IT Administrator / System Auditor

- **Objective:** Configures organizational constraints, manages role permissions, maintains system availability, and checks tamper-evident audit trails.
- **Pain Points:** Lack of granular database mutation logging and vulnerable security rules across internal business tools.

---

## 4. Functional Requirements

### 4.1 Item & Catalog Management Module

The system must maintain a deterministic global registry of all transactional entities (goods, parts, or services).

- **REQ-1.1 (CRUD Operations):** Authorized users must be able to Create, Read, Update, and Archive items. Deletion is soft-disabled if an item is tied to historical transactions.
- **REQ-1.2 (Strict Item Attributes):** Every item profile must strictly capture:
  - Unique Stock Keeping Unit (SKU) or Part Number (alphanumeric validation).
  - Formal Universal Product Code (UPC) or local catalog code.
  - Standardized Title and Detailed Description.
  - Structural Categorization (Nested Sub-categories).
  - Base Unit of Measure (UOM) (e.g., Pcs, Box, Kg, Hours).
- **REQ-1.3 (Financial Valuation Parameters):**
  - Cost Price: Precise procurement cost.
  - Selling Price: Default price applied during invoice generation.
  - Default Tax Profile: Applicable VAT/Tax brackets.

### 4.2 Stock Tracking & Inventory Module

The system must guarantee transactional synchronicity between inventory balances and operational activities.

- **REQ-2.1 (Real-Time Ledger Balances):** Balance totals must automatically recalculate based on verified incoming stock shifts or invoice closures.
- **REQ-2.2 (Stock Mutation Triggers):**
  - **Stock In (Procurement/Return):** Increments on-hand quantities via reference tracking numbers.
  - **Stock Out (Fulfillment/Scrap):** Decrements physical quantities, capturing descriptive scrap/loss reasoning.
  - **Reserved Stock:** Allocates quantities allocated to finalized invoices awaiting client delivery, preventing double-selling.
- **REQ-2.3 (Automated Safety Constraints):** Prevent transactional finalization if requested quantities exceed available physical stock, unless explicit "Allow Negative Stock" flags are toggle-authorized by an Administrator.
- **REQ-2.4 (Reorder Threshold Trigger):** Provide automated dashboard flags when an item's on-hand quantity falls below its preconfigured minimal safety threshold.

### 4.3 Invoicing & Billing Module

The billing engine governs financial pipeline execution, mandating absolute consistency across ledger calculations.

- **REQ-3.1 (Multi-Line Invoice Composer):** Enable creation of structured invoices containing multiple line items. Each line independently records:
  - Selected Item Reference.
  - Quantity ordered.
  - Per-unit baseline price (inherits from catalog but remains overridable via appropriate access permissions).
  - Individual line discounts (Percentage or flat value).
  - Calculated Line Total (Gross and Net after tax applications).
- **REQ-3.2 (High-Precision Calculation Engine):** All financial computations must bypass standard floating-point implementations. Rounding rules must follow commercial banking standard formatting (Round Half Up) extending to at least **4 decimal places** for internal calculations, formatting to 2 or 3 places depending on regional currency parameters (e.g., BHD vs. USD configurations).
- **REQ-3.3 (Invoice Lifecycle State-Machine):** Invoices must adhere to a strict, non-reversible directional workflow model to maintain operational sanity:

```
    [ Draft ] ──> [ Sent/Issued ] ──> [ Partially Paid ] ──> [ Fully Paid ]
        │                 │                     │
        └───> [ Cancelled ] <───────────────────┘
```

- **Draft:** Editable, does not lock stock quantities, non-binding.
- **Sent / Issued:** Locked from text modifications, reserves requested stock volumes, awaits payment clearing.
- **Partially Paid:** Records structural downpayments or installments, tracking residual balance metrics.
- **Fully Paid:** Completes the workflow cycle, issues final financial ledger clearance, and marks reserved inventory as permanently drawn down.
- **Cancelled:** Reverts inventory reservations and invalidates outstanding collection expectations. Reasons must be appended textually to the audit tracker.

---

## 5. Non-Functional & System Design Requirements

### 5.1 Financial Precision & Data Integrity

- All currency fields within database layer models must utilize custom precise types (equivalent Prisma Decimal bindings)
- Relational foreign key bindings must implement cascading constraints gracefully (`ON DELETE RESTRICT`) to prevent accidental wiping of historical item definitions tied to current billing ledgers.

### 5.2 Performance, Reliability, and Speed

- Read optimizations must be put in place to ensure that comprehensive multi-line stock summaries render under **200ms**.
- Concurrency controls (such as pessimistic or optimistic locking structures at the database layer) must protect stock records from race conditions during simultaneous checkout/invoicing procedures.

### 5.3 Audit Trails & Tamper-Proof Logs

- Every modification involving an invoice state shift or manual stock allocation must trigger an immutable audit row capturing:
  - Actor ID (The user executing the mutation).
  - High-precision timestamp.
  - Delta changes (Old Value JSON vs. New Value JSON payload).
