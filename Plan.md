# ERP System Implementation Blueprint

## Project Overview

This blueprint outlines the implementation of a production-ready, multi-tenant ERP system with a focus on Customer → Invoice → Inventory workflows as the foundation, followed by incremental feature additions.

---

## Phase 1: Foundation & Core Infrastructure (Week 1-2)

### 1.1 Multi-Tenancy Architecture

**Database Strategy:**

- Use Row-Level Security (RLS) with Prisma
- Every table has `tenantId` field (already in schema)
- Implement tenant isolation at middleware level

**Middleware Structure:**

```typescript
// src/middleware/tenant.middleware.ts
- Extract tenant from subdomain/header/JWT
- Attach tenant context to request
- Validate tenant is active

// src/middleware/auth.middleware.ts
- Verify JWT token
- Attach user to request context
- Check user belongs to tenant

// src/middleware/permission.middleware.ts
- Check user role/permissions
- Validate access to resources
- Implement RBAC (Role-Based Access Control)
```

**Implementation Pattern:**

```typescript
// Every Hono route follows this pattern:
app.use("/api/*", tenantMiddleware);
app.use("/api/*", authMiddleware);
app.get("/api/customers", permissionMiddleware(["ADMIN", "SALES_MANAGER"]), customerController.getAll);
```

### 1.2 Authentication System

**Files to Create:**

```
api/auth.route.ts
controllers/auth.controller.ts
services/auth.service.ts
utils/jwt.util.ts
utils/password.util.ts
```

**Features:**

- Registration (with tenant creation for first user)
- Login (returns JWT with tenantId, userId, role)
- Token refresh
- Password reset flow
- Email verification

**JWT Payload Structure:**

```typescript
{
  userId: number,
  tenantId: number,
  email: string,
  role: Role,
  permissions: string[]
}
```

---

## Phase 2: Core Business Modules (Week 3-6)

### 2.1 Customer Module (Week 3)

**Files:**

```
api/customers.route.ts
controllers/customers.controller.ts
services/customers.service.ts
validators/customers.validator.ts
src/app/customers/page.tsx
src/components/customers/CustomerList.tsx
src/components/customers/CustomerForm.tsx
src/components/customers/CustomerDetail.tsx
```

**API Endpoints:**

```typescript
GET    /api/customers              // List all (paginated, filtered)
GET    /api/customers/:id          // Get single customer
POST   /api/customers              // Create customer
PUT    /api/customers/:id          // Update customer
DELETE /api/customers/:id          // Delete customer
GET    /api/customers/:id/orders   // Get customer orders
GET    /api/customers/:id/invoices // Get customer invoices
POST   /api/customers/:id/contacts // Add contact person
```

**Business Logic (Controller):**

- Auto-generate customer number (CUST-0001)
- Validate credit limit
- Check for duplicate emails within tenant
- Calculate credit balance
- Handle customer status transitions

**UI Components:**

- Customer list with search/filter
- Customer form with validation
- Customer detail view with tabs (Info, Contacts, Orders, Invoices)
- Contact management sub-form

### 2.2 Product & Inventory Module (Week 4)

**Files:**

```
api/products.route.ts
api/inventory.route.ts
api/warehouses.route.ts
controllers/products.controller.ts
controllers/inventory.controller.ts
services/inventory.service.ts
src/app/products/page.tsx
src/components/products/ProductList.tsx
src/components/products/ProductForm.tsx
src/components/inventory/StockLevel.tsx
```

**API Endpoints:**

```typescript
// Products
GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
GET    /api/products/:id/stock    // Stock levels across warehouses

// Inventory
GET    /api/inventory              // All inventory
GET    /api/inventory/low-stock    // Products below reorder point
POST   /api/inventory/adjust       // Stock adjustment
GET    /api/inventory/movements    // Stock movement history

// Warehouses
GET    /api/warehouses
POST   /api/warehouses
PUT    /api/warehouses/:id
```

**Business Logic:**

- Auto-generate SKU
- Track inventory across multiple warehouses
- Calculate available quantity (quantity - reserved)
- Trigger low stock alerts
- Validate stock before sales orders
- Update inventory on sales/purchases
- Maintain stock movement audit trail

**Critical Inventory Functions:**

```typescript
// services/inventory.service.ts
async checkAvailability(productId, warehouseId, quantity)
async reserveStock(productId, warehouseId, quantity)
async releaseStock(productId, warehouseId, quantity)
async recordMovement(type, productId, warehouseId, quantity, reference)
async updateAverageCost(productId, warehouseId, newCost, quantity)
```

### 2.3 Sales Order Module (Week 5)

**Files:**

```
api/sales-orders.route.ts
controllers/sales-orders.controller.ts
services/sales-orders.service.ts
src/app/orders/page.tsx
src/components/orders/OrderForm.tsx
src/components/orders/OrderList.tsx
```

**API Endpoints:**

```typescript
GET    /api/orders
GET    /api/orders/:id
POST   /api/orders                 // Create from scratch or quotation
PUT    /api/orders/:id
DELETE /api/orders/:id
POST   /api/orders/:id/confirm     // Confirm order (reserves stock)
POST   /api/orders/:id/cancel      // Cancel order (releases stock)
GET    /api/orders/:id/invoice     // Generate invoice
```

**Business Logic:**

- Auto-generate order number (SO-2024-0001)
- Calculate totals (subtotal, tax, discount, shipping)
- Reserve stock when order confirmed
- Release stock when order cancelled
- Track order status workflow
- Validate customer credit limit
- Link to quotations if converted

**Order Status Workflow:**

```
DRAFT → PENDING → CONFIRMED → PROCESSING →
PARTIALLY_SHIPPED → SHIPPED → DELIVERED → COMPLETED
```

### 2.4 Invoice Module (Week 6)

**Files:**

```
api/invoices.route.ts
controllers/invoices.controller.ts
services/invoices.service.ts
src/app/invoices/page.tsx
src/components/invoices/InvoiceForm.tsx
src/components/invoices/InvoicePDF.tsx
```

**API Endpoints:**

```typescript
GET    /api/invoices
GET    /api/invoices/:id
POST   /api/invoices               // Create from order or standalone
PUT    /api/invoices/:id
DELETE /api/invoices/:id
POST   /api/invoices/:id/send      // Email invoice to customer
GET    /api/invoices/:id/pdf       // Generate PDF
POST   /api/invoices/:id/record-payment
GET    /api/invoices/overdue       // Get overdue invoices
```

**Business Logic:**

- Auto-generate invoice number (INV-2024-0001)
- Calculate due date from payment terms
- Track payment status
- Calculate aging (30, 60, 90+ days)
- Auto-mark as overdue
- Track partial payments
- Generate accounting entries (if Phase 3 ready)
- Send automated reminders

**Invoice Status Workflow:**

```
DRAFT → SENT → VIEWED → PARTIALLY_PAID → PAID
           ↓
        OVERDUE (auto-transition after due date)
```

---

## Phase 3: Payment & Financial Integration (Week 7-8)

### 3.1 Payment Module

**Files:**

```
api/payments.route.ts
controllers/payments.controller.ts
services/payments.service.ts
```

**API Endpoints:**

```typescript
GET    /api/payments
POST   /api/payments               // Record payment
GET    /api/payments/:id
POST   /api/payments/:id/reconcile
```

**Business Logic:**

- Link payments to invoices
- Update invoice paid/balance amounts
- Update customer credit balance
- Support partial payments
- Handle overpayments
- Track payment methods
- Generate receipt

### 3.2 Basic GL Accounting

**Files:**

```
services/accounting.service.ts
controllers/gl-accounts.controller.ts
```

**Features:**

- Auto-create journal entries for:
  - Sales invoices (DR: Accounts Receivable, CR: Revenue)
  - Payments received (DR: Cash, CR: Accounts Receivable)
  - Purchases (DR: Inventory, CR: Accounts Payable)
  - Payments made (DR: Accounts Payable, CR: Cash)

---

## Phase 4: Extended Features (Week 9-12)

### 4.1 Procurement Module

- Suppliers
- Purchase Orders
- Goods Receipt
- Bills (Supplier Invoices)

### 4.2 HR & Payroll

- Employees
- Departments
- Attendance
- Leave Management
- Payroll Processing

### 4.3 Advanced Features

- Project Management
- Asset Management
- Expense Management
- Budget & Forecasting
- Advanced Reporting

---

## Multi-Tenancy Implementation Guide

### Database Query Pattern

**Every Prisma query MUST include tenant filter:**

```typescript
// ❌ WRONG - Security vulnerability
const customers = await prisma.customer.findMany();

// ✅ CORRECT - Tenant isolated
const customers = await prisma.customer.findMany({
  where: { tenantId: req.tenant.id },
});
```

### Middleware Implementation

```typescript
// middleware/tenant.middleware.ts
export const tenantMiddleware = async (c, next) => {
  // Extract tenant from:
  // 1. Subdomain: customer1.erp.com
  // 2. Header: X-Tenant-ID
  // 3. JWT payload

  const hostname = c.req.header("host");
  const subdomain = hostname?.split(".")[0];

  const tenant = await prisma.tenant.findUnique({
    where: { slug: subdomain, isActive: true },
  });

  if (!tenant) {
    return c.json({ error: "Invalid tenant" }, 403);
  }

  c.set("tenant", tenant);
  await next();
};

// middleware/auth.middleware.ts
export const authMiddleware = async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = verifyJWT(token);

    // Validate user belongs to tenant
    if (payload.tenantId !== c.get("tenant").id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId, isActive: true },
    });

    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    c.set("user", user);
    await next();
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
};

// middleware/permission.middleware.ts
export const permissionMiddleware = (allowedRoles: Role[]) => {
  return async (c, next) => {
    const user = c.get("user");

    if (!allowedRoles.includes(user.role)) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }

    await next();
  };
};
```

### Route Protection Pattern

```typescript
// api/customers.route.ts
import { Hono } from "hono";
import { tenantMiddleware } from "../middleware/tenant.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { permissionMiddleware } from "../middleware/permission.middleware";
import * as customerController from "../controllers/customers.controller";

const app = new Hono();

// Apply middleware to all routes
app.use("*", tenantMiddleware);
app.use("*", authMiddleware);

// Routes with role-based access
app.get("/", permissionMiddleware(["ADMIN", "SALES_MANAGER", "SALES_REP"]), customerController.getAll);

app.post("/", permissionMiddleware(["ADMIN", "SALES_MANAGER"]), customerController.create);

app.put("/:id", permissionMiddleware(["ADMIN", "SALES_MANAGER"]), customerController.update);

app.delete("/:id", permissionMiddleware(["ADMIN"]), customerController.delete);

export default app;
```

---

## Service Layer Pattern

```typescript
// services/customers.service.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class CustomerService {
  async getAll(tenantId: number, filters: any) {
    return await prisma.customer.findMany({
      where: {
        tenantId,
        ...filters,
      },
      include: {
        contacts: true,
        paymentTerm: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(tenantId: number, id: number) {
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        contacts: true,
        orders: { take: 10, orderBy: { orderDate: "desc" } },
        invoices: { take: 10, orderBy: { invoiceDate: "desc" } },
      },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    return customer;
  }

  async create(tenantId: number, data: any) {
    // Generate customer number
    const lastCustomer = await prisma.customer.findFirst({
      where: { tenantId },
      orderBy: { customerNumber: "desc" },
    });

    const nextNumber = lastCustomer ? parseInt(lastCustomer.customerNumber.split("-")[1]) + 1 : 1;

    const customerNumber = `CUST-${String(nextNumber).padStart(4, "0")}`;

    return await prisma.customer.create({
      data: {
        ...data,
        tenantId,
        customerNumber,
      },
    });
  }

  async update(tenantId: number, id: number, data: any) {
    // Verify ownership
    const existing = await this.getById(tenantId, id);

    return await prisma.customer.update({
      where: { id },
      data,
    });
  }

  async delete(tenantId: number, id: number) {
    const existing = await this.getById(tenantId, id);

    // Check for dependencies
    const hasOrders = await prisma.salesOrder.count({
      where: { customerId: id },
    });

    if (hasOrders > 0) {
      throw new Error("Cannot delete customer with existing orders");
    }

    return await prisma.customer.delete({
      where: { id },
    });
  }
}
```

---

## Controller Pattern

```typescript
// controllers/customers.controller.ts
import { Context } from "hono";
import { CustomerService } from "../services/customers.service";

const customerService = new CustomerService();

export const getAll = async (c: Context) => {
  try {
    const tenant = c.get("tenant");
    const { search, status, page = 1, limit = 20 } = c.req.query();

    const filters: any = {};
    if (search) {
      filters.OR = [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }];
    }
    if (status) filters.status = status;

    const customers = await customerService.getAll(tenant.id, filters);

    return c.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500,
    );
  }
};

export const getById = async (c: Context) => {
  try {
    const tenant = c.get("tenant");
    const id = parseInt(c.req.param("id"));

    const customer = await customerService.getById(tenant.id, id);

    return c.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      404,
    );
  }
};

export const create = async (c: Context) => {
  try {
    const tenant = c.get("tenant");
    const user = c.get("user");
    const body = await c.req.json();

    // Validate input
    // ... validation logic

    const customer = await customerService.create(tenant.id, body);

    // Audit log
    await logAudit({
      action: "CREATE",
      entity: "Customer",
      entityId: customer.id,
      userId: user.id,
      after: customer,
    });

    return c.json(
      {
        success: true,
        data: customer,
      },
      201,
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      400,
    );
  }
};

export const update = async (c: Context) => {
  try {
    const tenant = c.get("tenant");
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();

    const before = await customerService.getById(tenant.id, id);
    const customer = await customerService.update(tenant.id, id, body);

    await logAudit({
      action: "UPDATE",
      entity: "Customer",
      entityId: id,
      userId: user.id,
      before,
      after: customer,
    });

    return c.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      400,
    );
  }
};

export const deleteCustomer = async (c: Context) => {
  try {
    const tenant = c.get("tenant");
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));

    const before = await customerService.getById(tenant.id, id);
    await customerService.delete(tenant.id, id);

    await logAudit({
      action: "DELETE",
      entity: "Customer",
      entityId: id,
      userId: user.id,
      before,
    });

    return c.json({
      success: true,
      message: "Customer deleted",
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error.message,
      },
      400,
    );
  }
};
```

---

## Critical Business Logic Implementations

### Inventory Management

```typescript
// services/inventory.service.ts

export class InventoryService {
  // Check if sufficient stock available
  async checkAvailability(tenantId: number, productId: number, warehouseId: number, quantity: number): Promise<boolean> {
    const inventory = await prisma.inventory.findUnique({
      where: {
        productId_variantId_warehouseId: {
          productId,
          variantId: null,
          warehouseId,
        },
      },
    });

    if (!inventory) return false;

    return inventory.availableQuantity >= quantity;
  }

  // Reserve stock for an order
  async reserveStock(tenantId: number, productId: number, warehouseId: number, quantity: number, reference: string) {
    const available = await this.checkAvailability(tenantId, productId, warehouseId, quantity);

    if (!available) {
      throw new Error("Insufficient stock");
    }

    await prisma.inventory.update({
      where: {
        productId_variantId_warehouseId: {
          productId,
          variantId: null,
          warehouseId,
        },
      },
      data: {
        reservedQuantity: { increment: quantity },
        availableQuantity: { decrement: quantity },
      },
    });

    // Log movement
    await this.recordMovement({
      tenantId,
      type: "SALE",
      productId,
      warehouseId,
      quantity: -quantity,
      reference,
      referenceType: "ORDER",
    });
  }

  // Release reserved stock
  async releaseStock(tenantId: number, productId: number, warehouseId: number, quantity: number) {
    await prisma.inventory.update({
      where: {
        productId_variantId_warehouseId: {
          productId,
          variantId: null,
          warehouseId,
        },
      },
      data: {
        reservedQuantity: { decrement: quantity },
        availableQuantity: { increment: quantity },
      },
    });
  }

  // Actually deduct stock (when shipped)
  async deductStock(tenantId: number, productId: number, warehouseId: number, quantity: number) {
    await prisma.inventory.update({
      where: {
        productId_variantId_warehouseId: {
          productId,
          variantId: null,
          warehouseId,
        },
      },
      data: {
        quantity: { decrement: quantity },
        reservedQuantity: { decrement: quantity },
      },
    });
  }

  // Add stock (from purchase)
  async addStock(tenantId: number, productId: number, warehouseId: number, quantity: number, unitCost: number, reference: string) {
    const inventory = await prisma.inventory.findUnique({
      where: {
        productId_variantId_warehouseId: {
          productId,
          variantId: null,
          warehouseId,
        },
      },
    });

    if (inventory) {
      // Update average cost
      const newTotalCost = inventory.averageCost * inventory.quantity + unitCost * quantity;
      const newQuantity = inventory.quantity + quantity;
      const newAverageCost = newTotalCost / newQuantity;

      await prisma.inventory.update({
        where: {
          productId_variantId_warehouseId: {
            productId,
            variantId: null,
            warehouseId,
          },
        },
        data: {
          quantity: { increment: quantity },
          availableQuantity: { increment: quantity },
          averageCost: newAverageCost,
          totalValue: newTotalCost,
          lastRestockDate: new Date(),
        },
      });
    } else {
      // Create new inventory record
      await prisma.inventory.create({
        data: {
          productId,
          warehouseId,
          quantity,
          availableQuantity: quantity,
          averageCost: unitCost,
          totalValue: unitCost * quantity,
          lastRestockDate: new Date(),
        },
      });
    }

    // Log movement
    await this.recordMovement({
      tenantId,
      type: "PURCHASE",
      productId,
      warehouseId,
      quantity,
      unitCost,
      reference,
      referenceType: "PURCHASE_ORDER",
    });
  }

  // Record stock movement
  async recordMovement(data: {
    tenantId: number;
    type: MovementType;
    productId: number;
    warehouseId: number;
    quantity: number;
    unitCost?: number;
    reference?: string;
    referenceType?: string;
    reason?: string;
  }) {
    const inventory = await prisma.inventory.findUnique({
      where: {
        productId_variantId_warehouseId: {
          productId: data.productId,
          variantId: null,
          warehouseId: data.warehouseId,
        },
      },
    });

    const movementNumber = await this.generateMovementNumber(data.tenantId);

    await prisma.stockMovement.create({
      data: {
        movementNumber,
        type: data.type,
        productId: data.productId,
        warehouseId: data.warehouseId,
        quantity: data.quantity,
        unitCost: data.unitCost,
        totalCost: data.unitCost ? data.unitCost * Math.abs(data.quantity) : null,
        balanceQuantity: inventory?.quantity || 0,
        reference: data.reference,
        referenceType: data.referenceType,
        reason: data.reason,
        createdBy: "System", // Should be actual user
      },
    });
  }
}
```

### Sales Order Processing

```typescript
// services/sales-orders.service.ts

export class SalesOrderService {
  async create(tenantId: number, userId: number, data: any) {
    // Generate order number
    const orderNumber = await this.generateOrderNumber(tenantId);

    // Calculate totals
    const totals = this.calculateOrderTotals(data.items, data.discountPercent, data.taxAmount, data.shippingCost);

    // Create order in transaction
    const order = await prisma.$transaction(async tx => {
      const newOrder = await tx.salesOrder.create({
        data: {
          tenantId,
          orderNumber,
          customerId: data.customerId,
          orderDate: new Date(),
          status: "DRAFT",
          ...totals,
          createdBy: userId,
          items: {
            create: data.items.map(item => ({
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
              taxRate: item.taxRate || 0,
              totalPrice: item.quantity * item.unitPrice - (item.discount || 0),
              warehouseId: item.warehouseId,
            })),
          },
        },
        include: { items: true },
      });

      return newOrder;
    });

    return order;
  }

  async confirmOrder(tenantId: number, orderId: number, userId: number) {
    const order = await prisma.salesOrder.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true, customer: true },
    });

    if (!order) throw new Error("Order not found");
    if (order.status !== "DRAFT" && order.status !== "PENDING") {
      throw new Error("Order cannot be confirmed");
    }

    // Check customer credit limit
    if (order.customer.creditLimit) {
      const newBalance = order.customer.creditBalance + order.totalAmount;
      if (newBalance > order.customer.creditLimit) {
        throw new Error("Customer credit limit exceeded");
      }
    }

    // Check and reserve stock
    const inventoryService = new InventoryService();

    await prisma.$transaction(async tx => {
      // Reserve stock for each item
      for (const item of order.items) {
        if (item.productId && item.warehouseId) {
          await inventoryService.reserveStock(tenantId, item.productId, item.warehouseId, item.quantity, `SO-${order.orderNumber}`);
        }
      }

      // Update order status
      await tx.salesOrder.update({
        where: { id: orderId },
        data: { status: "CONFIRMED" },
      });

      // Update customer credit balance
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          creditBalance: { increment: order.totalAmount },
        },
      });
    });

    return await this.getById(tenantId, orderId);
  }

  async cancelOrder(tenantId: number, orderId: number) {
    const order = await prisma.salesOrder.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true },
    });

    if (!order) throw new Error("Order not found");

    // Release reserved stock
    const inventoryService = new InventoryService();

    await prisma.$transaction(async tx => {
      // Release stock for each item
      for (const item of order.items) {
        if (item.productId && item.warehouseId) {
          await inventoryService.releaseStock(tenantId, item.productId, item.warehouseId, item.quantity);
        }
      }

      // Update order status
      await tx.salesOrder.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      });

      // Update customer credit balance
      if (order.status === "CONFIRMED") {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            creditBalance: { decrement: order.totalAmount },
          },
        });
      }
    });

    return await this.getById(tenantId, orderId);
  }

  calculateOrderTotals(items: any[], discountPercent: number, taxAmount: number, shippingCost: number) {
    const subtotal = items.reduce((sum, item) => {
      return sum + item.quantity * item.unitPrice;
    }, 0);

    const discountAmount = (subtotal * discountPercent) / 100;
    const totalAmount = subtotal - discountAmount + taxAmount + shippingCost;

    return {
      subtotal,
      discountPercent,
      discountAmount,
      taxAmount,
      shippingCost,
      totalAmount,
    };
  }
}
```

### Invoice Generation & Payment Processing

```typescript
// services/invoices.service.ts

export class InvoiceService {
  async createFromOrder(tenantId: number, orderId: number, userId: number) {
    const order = await prisma.salesOrder.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: true,
        customer: { include: { paymentTerm: true } },
      },
    });

    if (!order) throw new Error("Order not found");

    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    // Calculate due date
    const invoiceDate = new Date();
    const dueDate = new Date(invoiceDate);
    if (order.customer.paymentTerm) {
      dueDate.setDate(dueDate.getDate() + order.customer.paymentTerm.dueDays);
    } else {
      dueDate.setDate(dueDate.getDate() + 30); // Default 30 days
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        invoiceDate,
        dueDate,
        customerId: order.customerId,
        orderId: order.id,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        taxAmount: order.taxAmount,
        shippingCost: order.shippingCost,
        totalAmount: order.totalAmount,
        balanceAmount: order.totalAmount,
        paidAmount: 0,
        status: "DRAFT",
        paymentTermId: order.paymentTermId,
        currency: order.currency,
        createdBy: userId.toString(),
      },
    });

    return invoice;
  }

  async recordPayment(tenantId: number, invoiceId: number, amount: number, paymentData: any) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId },
      include: { customer: true },
    });

    if (!invoice) throw new Error("Invoice not found");

    const newPaidAmount = invoice.paidAmount + amount;
    const newBalance = invoice.totalAmount - newPaidAmount;

    await prisma.$transaction(async tx => {
      // Create payment record
      await tx.payment.create({
        data: {
          paymentNumber: await this.generatePaymentNumber(tenantId),
          paymentDate: new Date(),
          amount,
          type: "INCOMING",
          method: paymentData.method,
          status: "COMPLETED",
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          reference: paymentData.reference,
          notes: paymentData.notes,
          createdBy: paymentData.userId.toString(),
        },
      });

      // Update invoice
      let newStatus = invoice.status;
      if (newBalance === 0) {
        newStatus = "PAID";
      } else if (newBalance < invoice.totalAmount) {
        newStatus = "PARTIALLY_PAID";
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalance,
          status: newStatus,
        },
      });

      // Update customer balance
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: {
          creditBalance: { decrement: amount },
        },
      });
    });

    return await this.getById(tenantId, invoiceId);
  }

  // Auto-mark overdue invoices (run as cron job)
  async markOverdueInvoices(tenantId: number) {
    const today = new Date();

    await prisma.invoice.updateMany({
      where: {
        dueDate: { lt: today },
        status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID"] },
      },
      data: {
        status: "OVERDUE",
      },
    });
  }
}
```

---

## Frontend Architecture (Next.js 15+)

### Folder Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── customers/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── new/page.tsx
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── orders/
│   │   └── invoices/
│   └── api/
│       └── [...all routes via Hono]
├── components/
│   ├── ui/ (shadcn components)
│   ├── customers/
│   ├── products/
│   ├── orders/
│   ├── invoices/
│   └── common/
├── lib/
│   ├── api-client.ts
│   ├── auth.ts
│   └── utils.ts
├── hooks/
│   ├── useCustomers.ts
│   ├── useProducts.ts
│   └── useAuth.ts
└── types/
    └── api.ts
```

### API Client Setup

```typescript
// lib/api-client.ts
import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add tenant from subdomain
  const hostname = window.location.hostname;
  const subdomain = hostname.split(".")[0];
  config.headers["X-Tenant-Slug"] = subdomain;

  return config;
});

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default apiClient;
```

### Custom Hooks

```typescript
// hooks/useCustomers.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";

export const useCustomers = (filters?: any) => {
  return useQuery({
    queryKey: ["customers", filters],
    queryFn: async () => {
      const { data } = await apiClient.get("/customers", { params: filters });
      return data.data;
    },
  });
};

export const useCustomer = (id: number) => {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/customers/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerData: any) => {
      const { data } = await apiClient.post("/customers", customerData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiClient.put(`/customers/${id}`, data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", variables.id] });
    },
  });
};
```

---

## Progress Tracking & Testing Checklist

### Phase 1: Foundation ✅

- [ ] Multi-tenancy middleware
- [ ] Authentication system
- [ ] JWT generation & validation
- [ ] Role-based access control
- [ ] Audit logging
- [ ] Error handling

### Phase 2: Core Modules

#### Customers ✅

- [ ] List customers (with pagination, search, filter)
- [ ] Create customer (auto-generate number)
- [ ] Update customer
- [ ] Delete customer (with dependency check)
- [ ] Add/manage contacts
- [ ] View customer orders
- [ ] View customer invoices

#### Products & Inventory ✅

- [ ] List products
- [ ] Create product (auto-generate SKU)
- [ ] Update product
- [ ] Delete product
- [ ] Manage categories & brands
- [ ] View stock levels by warehouse
- [ ] Stock adjustment
- [ ] Low stock alerts
- [ ] Stock movement history

#### Sales Orders ✅

- [ ] List orders
- [ ] Create order
- [ ] Update order (draft only)
- [ ] Confirm order (reserve stock)
- [ ] Cancel order (release stock)
- [ ] Check customer credit limit
- [ ] Order status workflow
- [ ] Convert quotation to order

#### Invoices ✅

- [ ] List invoices
- [ ] Create invoice from order
- [ ] Create standalone invoice
- [ ] Update invoice (draft only)
- [ ] Send invoice email
- [ ] Generate PDF
- [ ] Record payment
- [ ] Auto-mark overdue
- [ ] Invoice aging report

### Phase 3: Payments ✅

- [ ] Record customer payment
- [ ] Record supplier payment
- [ ] Link payment to invoice/bill
- [ ] Partial payments
- [ ] Payment reconciliation
- [ ] Payment history

### Phase 4: Extended Features

- [ ] Procurement module
- [ ] HR & Payroll
- [ ] Project management
- [ ] Reporting & analytics

---

## Database Migration Strategy

```bash
# Initial migration
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# Seed initial data
npx prisma db seed
```

### Seed Script

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create demo tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "Demo Company",
      slug: "demo",
      email: "admin@demo.com",
      country: "BH",
      currency: "BHD",
    },
  });

  // Create admin user
  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@demo.com",
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      tenantId: tenant.id,
      isActive: true,
      isEmailVerified: true,
    },
  });

  // Create default warehouse
  await prisma.warehouse.create({
    data: {
      code: "WH-001",
      name: "Main Warehouse",
      type: "MAIN",
      isDefault: true,
      tenantId: tenant.id,
    },
  });

  // Create payment terms
  await prisma.paymentTerm.create({
    data: {
      name: "Net 30",
      dueDays: 30,
      tenantId: tenant.id,
    },
  });

  // Create GL accounts
  const accounts = [
    { code: "1000", name: "Cash", type: "ASSET", normalBalance: "DEBIT" },
    { code: "1200", name: "Accounts Receivable", type: "ASSET", normalBalance: "DEBIT" },
    { code: "1500", name: "Inventory", type: "ASSET", normalBalance: "DEBIT" },
    { code: "2000", name: "Accounts Payable", type: "LIABILITY", normalBalance: "CREDIT" },
    { code: "4000", name: "Sales Revenue", type: "REVENUE", normalBalance: "CREDIT" },
    { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", normalBalance: "DEBIT" },
  ];

  for (const account of accounts) {
    await prisma.gLAccount.create({
      data: {
        ...account,
        tenantId: tenant.id,
      },
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## Environment Variables

```env
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/erp_db"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_SECRET="your-refresh-token-secret"
REFRESH_TOKEN_EXPIRES_IN="30d"

# Email (for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/services/customers.service.test.ts
import { CustomerService } from "@/services/customers.service";

describe("CustomerService", () => {
  it("should create customer with auto-generated number", async () => {
    const service = new CustomerService();
    const customer = await service.create(1, {
      name: "Test Customer",
      email: "test@example.com",
    });

    expect(customer.customerNumber).toMatch(/CUST-\d{4}/);
  });

  it("should throw error when deleting customer with orders", async () => {
    // Test implementation
  });
});
```

### Integration Tests

```typescript
// __tests__/api/customers.test.ts
import { testClient } from "hono/testing";
import app from "@/api/customers.route";

describe("Customer API", () => {
  it("GET /customers returns list", async () => {
    const res = await testClient(app).get("/customers");
    expect(res.status).toBe(200);
  });

  it("POST /customers requires authentication", async () => {
    const res = await testClient(app).post("/customers", {
      json: { name: "Test" },
    });
    expect(res.status).toBe(401);
  });
});
```

---

## Deployment Checklist

### Pre-Production

- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Backup strategy in place

### Production

- [ ] Database backed up
- [ ] Monitoring enabled (Sentry, LogRocket)
- [ ] Performance monitoring (Vercel Analytics)
- [ ] CDN configured for static assets
- [ ] Email service configured
- [ ] Automated testing in CI/CD

---

## Common Pitfalls & Solutions

### 1. **Tenant Isolation Breach**

❌ **Wrong:**

```typescript
const customer = await prisma.customer.findUnique({ where: { id } });
```

✅ **Correct:**

```typescript
const customer = await prisma.customer.findFirst({
  where: { id, tenantId: req.tenant.id },
});
```

### 2. **Stock Not Reserved**

Always use transactions when creating orders that affect inventory.

### 3. **Cascading Deletes**

Be careful with `onDelete: Cascade`. Some relationships should prevent deletion (e.g., customer with orders).

### 4. **Number Sequences**

Generate sequential numbers within tenant scope, not globally.

### 5. **Decimal Precision**

Always use `@db.Decimal()` for money and quantities, never floats.

---

## Next Steps After Core Implementation

1. **Advanced Reporting**
   - Sales by customer/product
   - Inventory valuation
   - Aged receivables/payables
   - Profit & loss statement
   - Balance sheet

2. **Notifications**
   - Low stock alerts
   - Overdue invoices
   - Payment received
   - Order status changes

3. **Mobile App**
   - React Native app
   - Barcode scanning
   - Mobile POS

4. **Integrations**
   - Payment gateways (Stripe, PayPal)
   - Shipping providers
   - Accounting software (QuickBooks)
   - Email marketing (Mailchimp)

5. **Performance Optimization**
   - Database indexing
   - Query optimization
   - Caching (Redis)
   - Background jobs (Bull)

---

This blueprint provides a complete roadmap for building the ERP system incrementally while maintaining code quality, security, and scalability. Start with Phase 1 and 2, then expand based on business priorities.
