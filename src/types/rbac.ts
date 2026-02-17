export enum Permission {
  // Customer permissions
  CUSTOMER_READ = "customer:read",
  CUSTOMER_CREATE = "customer:create",
  CUSTOMER_UPDATE = "customer:update",
  CUSTOMER_DELETE = "customer:delete",

  // Invoice permissions
  INVOICE_READ = "invoice:read",
  INVOICE_CREATE = "invoice:create",
  INVOICE_UPDATE = "invoice:update",
  INVOICE_DELETE = "invoice:delete",
  INVOICE_APPROVE = "invoice:approve",

  // Asset permissions
  ASSET_READ = "asset:read",
  ASSET_CREATE = "asset:create",
  ASSET_UPDATE = "asset:update",
  ASSET_DELETE = "asset:delete",

  // Stock permissions
  STOCK_READ = "stock:read",
  STOCK_CREATE = "stock:create",
  STOCK_UPDATE = "stock:update",
  STOCK_DELETE = "stock:delete",

  // Warehouse permissions
  WAREHOUSE_READ = "warehouse:read",
  WAREHOUSE_CREATE = "warehouse:create",
  WAREHOUSE_UPDATE = "warehouse:update",
  WAREHOUSE_DELETE = "warehouse:delete",

  // Transaction permissions
  TRANSACTION_READ = "transaction:read",
  TRANSACTION_CREATE = "transaction:create",
  TRANSACTION_UPDATE = "transaction:update",
  TRANSACTION_DELETE = "transaction:delete",

  // User permissions
  USER_READ = "user:read",
  USER_CREATE = "user:create",
  USER_UPDATE = "user:update",
  USER_DELETE = "user:delete",

  // Tenant permissions
  TENANT_MANAGE = "tenant:manage",
}

export const RolePermissions: Record<string, Permission[]> = {
  SUPER_ADMIN: Object.values(Permission),
  ADMIN: [
    Permission.CUSTOMER_READ,
    Permission.CUSTOMER_CREATE,
    Permission.CUSTOMER_UPDATE,
    Permission.INVOICE_READ,
    Permission.INVOICE_CREATE,
    Permission.INVOICE_UPDATE,
    Permission.INVOICE_DELETE,
    Permission.INVOICE_APPROVE,
    Permission.ASSET_READ,
    Permission.ASSET_CREATE,
    Permission.ASSET_UPDATE,
    Permission.STOCK_READ,
    Permission.STOCK_CREATE,
    Permission.STOCK_UPDATE,
    Permission.WAREHOUSE_READ,
    Permission.WAREHOUSE_CREATE,
    Permission.WAREHOUSE_UPDATE,
    Permission.TRANSACTION_READ,
    Permission.TRANSACTION_CREATE,
    Permission.USER_READ,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
  ],
  MANAGER: [
    Permission.CUSTOMER_READ,
    Permission.CUSTOMER_CREATE,
    Permission.CUSTOMER_UPDATE,
    Permission.INVOICE_READ,
    Permission.INVOICE_CREATE,
    Permission.INVOICE_UPDATE,
    Permission.ASSET_READ,
    Permission.STOCK_READ,
    Permission.WAREHOUSE_READ,
    Permission.TRANSACTION_READ,
    Permission.USER_READ,
  ],
  ACCOUNTANT: [Permission.CUSTOMER_READ, Permission.INVOICE_READ, Permission.INVOICE_CREATE, Permission.INVOICE_UPDATE, Permission.TRANSACTION_READ, Permission.TRANSACTION_CREATE],
  WAREHOUSE_MANAGER: [
    Permission.STOCK_READ,
    Permission.STOCK_CREATE,
    Permission.STOCK_UPDATE,
    Permission.WAREHOUSE_READ,
    Permission.WAREHOUSE_CREATE,
    Permission.WAREHOUSE_UPDATE,
    Permission.ASSET_READ,
  ],
  SALES: [Permission.CUSTOMER_READ, Permission.CUSTOMER_CREATE, Permission.INVOICE_READ, Permission.INVOICE_CREATE, Permission.STOCK_READ],
  USER: [Permission.CUSTOMER_READ, Permission.INVOICE_READ, Permission.STOCK_READ],
};
