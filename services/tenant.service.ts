import db from "@/lib/database";

export interface CreateTenantDTO {
  name: string;
  plan?: string;
}

export class TenantService {
  /**
   * Get tenant by ID
   */
  static async getById(id: string) {
    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            invoices: true,
            assets: true,
            warehouses: true,
            stockItems: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    return tenant;
  }

  /**
   * Update tenant
   */
  static async update(id: string, data: { name?: string; plan?: string; isActive?: boolean }) {
    return db.tenant.update({
      where: { id },
      data,
    });
  }

  /**
   * Get tenant statistics
   */
  static async getStats(tenantId: string) {
    const [userCount, customerCount, invoiceCount, assetCount, warehouseCount, stockItemCount, transactionCount] = await Promise.all([
      db.user.count({ where: { tenantId } }),
      db.customer.count({ where: { tenantId } }),
      db.invoice.count({ where: { tenantId } }),
      db.asset.count({ where: { tenantId } }),
      db.warehouse.count({ where: { tenantId } }),
      db.stockItem.count({ where: { tenantId } }),
      db.transaction.count({ where: { tenantId } }),
    ]);

    return {
      users: userCount,
      customers: customerCount,
      invoices: invoiceCount,
      assets: assetCount,
      warehouses: warehouseCount,
      stockItems: stockItemCount,
      transactions: transactionCount,
    };
  }

  /**
   * List all users in tenant
   */
  static async getUsers(tenantId: string) {
    return db.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
