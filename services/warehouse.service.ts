import db from "@/lib/database";
import { Prisma } from "@prisma/client";

export interface CreateWarehouseDTO {
  name: string;
  location: string;
  capacity?: number;
}

export class WarehouseService {
  /**
   * Create new warehouse
   */
  static async create(tenantId: string, data: CreateWarehouseDTO) {
    return db.warehouse.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  /**
   * Get warehouse by ID
   */
  static async getById(id: string, tenantId: string) {
    const warehouse = await db.warehouse.findFirst({
      where: { id, tenantId },
      include: {
        stockItems: {
          select: {
            id: true,
            sku: true,
            name: true,
            quantity: true,
            minQuantity: true,
          },
        },
      },
    });

    if (!warehouse) {
      throw new Error("Warehouse not found");
    }

    return warehouse;
  }

  /**
   * List warehouses
   */
  static async list(
    tenantId: string,
    filters: {
      isActive?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { isActive, search, page = 1, limit = 20 } = filters;

    const where: Prisma.WarehouseWhereInput = {
      tenantId,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [{ name: { contains: search, mode: "insensitive" } }, { location: { contains: search, mode: "insensitive" } }],
      }),
    };

    const [warehouses, total] = await Promise.all([
      db.warehouse.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { stockItems: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.warehouse.count({ where }),
    ]);

    return { warehouses, total, page, limit };
  }

  /**
   * Update warehouse
   */
  static async update(id: string, tenantId: string, data: Partial<CreateWarehouseDTO> & { isActive?: boolean }) {
    const warehouse = await db.warehouse.findFirst({
      where: { id, tenantId },
    });

    if (!warehouse) {
      throw new Error("Warehouse not found");
    }

    return db.warehouse.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete warehouse
   */
  static async delete(id: string, tenantId: string) {
    const warehouse = await db.warehouse.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { stockItems: true },
        },
      },
    });

    if (!warehouse) {
      throw new Error("Warehouse not found");
    }

    if (warehouse._count.stockItems > 0) {
      throw new Error("Cannot delete warehouse with existing stock items");
    }

    return db.warehouse.delete({
      where: { id },
    });
  }

  /**
   * Get warehouse statistics
   */
  static async getStats(tenantId: string) {
    const [total, active, inactive] = await Promise.all([
      db.warehouse.count({ where: { tenantId } }),
      db.warehouse.count({ where: { tenantId, isActive: true } }),
      db.warehouse.count({ where: { tenantId, isActive: false } }),
    ]);

    return { total, active, inactive };
  }
}
