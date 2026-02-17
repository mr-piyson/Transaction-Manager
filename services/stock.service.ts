import db from "@/lib/database";
import { Prisma } from "@prisma/client";

export interface CreateStockItemDTO {
  sku: string;
  name: string;
  description?: string;
  quantity: number;
  minQuantity: number;
  unitPrice: number;
  warehouseId: string;
}

export class StockService {
  /**
   * Create new stock item
   */
  static async create(tenantId: string, data: CreateStockItemDTO) {
    // Verify warehouse belongs to tenant
    const warehouse = await db.warehouse.findFirst({
      where: { id: data.warehouseId, tenantId },
    });

    if (!warehouse) {
      throw new Error("Warehouse not found");
    }

    // Check if SKU already exists in tenant
    const existing = await db.stockItem.findFirst({
      where: {
        sku: data.sku,
        tenantId,
      },
    });

    if (existing) {
      throw new Error("Stock item with this SKU already exists");
    }

    return db.stockItem.create({
      data: {
        ...data,
        unitPrice: data.unitPrice.toString(),
        tenantId,
      },
      include: {
        warehouse: true,
      },
    });
  }

  /**
   * Get stock item by ID
   */
  static async getById(id: string, tenantId: string) {
    const item = await db.stockItem.findFirst({
      where: { id, tenantId },
      include: {
        warehouse: true,
      },
    });

    if (!item) {
      throw new Error("Stock item not found");
    }

    return item;
  }

  /**
   * List stock items with pagination and filters
   */
  static async list(
    tenantId: string,
    filters: {
      warehouseId?: string;
      search?: string;
      lowStock?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const { warehouseId, search, lowStock, page = 1, limit = 20 } = filters;

    const where: Prisma.StockItemWhereInput = {
      tenantId,
      ...(warehouseId && { warehouseId }),
      ...(search && {
        OR: [{ name: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }],
      }),
      ...(lowStock && {
        quantity: {
          lte: db.stockItem.fields.minQuantity,
        },
      }),
    };

    const [items, total] = await Promise.all([
      db.stockItem.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.stockItem.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Update stock quantity
   */
  static async updateQuantity(id: string, tenantId: string, quantity: number, operation: "add" | "subtract" | "set") {
    const item = await db.stockItem.findFirst({
      where: { id, tenantId },
    });

    if (!item) {
      throw new Error("Stock item not found");
    }

    let newQuantity = item.quantity;

    switch (operation) {
      case "add":
        newQuantity += quantity;
        break;
      case "subtract":
        newQuantity -= quantity;
        if (newQuantity < 0) {
          throw new Error("Insufficient stock quantity");
        }
        break;
      case "set":
        newQuantity = quantity;
        break;
    }

    return db.stockItem.update({
      where: { id },
      data: { quantity: newQuantity },
    });
  }

  /**
   * Update stock item
   */
  static async update(id: string, tenantId: string, data: Partial<CreateStockItemDTO>) {
    const item = await db.stockItem.findFirst({
      where: { id, tenantId },
    });

    if (!item) {
      throw new Error("Stock item not found");
    }

    const updateData: any = { ...data };
    if (data.unitPrice) updateData.unitPrice = data.unitPrice.toString();

    return db.stockItem.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete stock item
   */
  static async delete(id: string, tenantId: string) {
    const item = await db.stockItem.findFirst({
      where: { id, tenantId },
    });

    if (!item) {
      throw new Error("Stock item not found");
    }

    return db.stockItem.delete({
      where: { id },
    });
  }

  /**
   * Get low stock items
   */
  static async getLowStock(tenantId: string) {
    return db.stockItem.findMany({
      where: {
        tenantId,
        quantity: {
          lte: db.stockItem.fields.minQuantity,
        },
      },
      include: {
        warehouse: true,
      },
      orderBy: { quantity: "asc" },
    });
  }

  /**
   * Get stock statistics
   */
  static async getStats(tenantId: string) {
    const [total, lowStock, outOfStock] = await Promise.all([
      db.stockItem.count({ where: { tenantId } }),
      db.stockItem.count({
        where: {
          tenantId,
          quantity: {
            lte: db.stockItem.fields.minQuantity,
          },
        },
      }),
      db.stockItem.count({
        where: {
          tenantId,
          quantity: 0,
        },
      }),
    ]);

    const totalValue = await db.stockItem.aggregate({
      where: { tenantId },
      _sum: {
        quantity: true,
      },
    });

    return {
      total,
      lowStock,
      outOfStock,
      totalItems: totalValue._sum.quantity || 0,
    };
  }
}
