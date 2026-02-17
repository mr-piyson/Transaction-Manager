import db from "@/lib/database";
import { Prisma, AssetStatus } from "@prisma/client";

export interface CreateAssetDTO {
  name: string;
  description?: string;
  serialNumber?: string;
  purchaseDate: Date;
  purchasePrice: number;
  currentValue: number;
  category: string;
  location?: string;
}

export class AssetService {
  /**
   * Create new asset
   */
  static async create(tenantId: string, data: CreateAssetDTO) {
    return db.asset.create({
      data: {
        ...data,
        purchasePrice: data.purchasePrice.toString(),
        currentValue: data.currentValue.toString(),
        tenantId,
      },
    });
  }

  /**
   * Get asset by ID
   */
  static async getById(id: string, tenantId: string) {
    const asset = await db.asset.findFirst({
      where: { id, tenantId },
    });

    if (!asset) {
      throw new Error("Asset not found");
    }

    return asset;
  }

  /**
   * List assets with pagination and filters
   */
  static async list(
    tenantId: string,
    filters: {
      category?: string;
      status?: AssetStatus;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { category, status, search, page = 1, limit = 20 } = filters;

    const where: Prisma.AssetWhereInput = {
      tenantId,
      ...(category && { category }),
      ...(status && { status }),
      ...(search && {
        OR: [{ name: { contains: search, mode: "insensitive" } }, { serialNumber: { contains: search, mode: "insensitive" } }],
      }),
    };

    const [assets, total] = await Promise.all([
      db.asset.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.asset.count({ where }),
    ]);

    return { assets, total, page, limit };
  }

  /**
   * Update asset
   */
  static async update(id: string, tenantId: string, data: Partial<CreateAssetDTO> & { status?: AssetStatus }) {
    const asset = await db.asset.findFirst({
      where: { id, tenantId },
    });

    if (!asset) {
      throw new Error("Asset not found");
    }

    const updateData: any = { ...data };
    if (data.purchasePrice) updateData.purchasePrice = data.purchasePrice.toString();
    if (data.currentValue) updateData.currentValue = data.currentValue.toString();

    return db.asset.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete asset
   */
  static async delete(id: string, tenantId: string) {
    const asset = await db.asset.findFirst({
      where: { id, tenantId },
    });

    if (!asset) {
      throw new Error("Asset not found");
    }

    return db.asset.delete({
      where: { id },
    });
  }

  /**
   * Get asset statistics
   */
  static async getStats(tenantId: string) {
    const [total, active, maintenance, retired] = await Promise.all([
      db.asset.count({ where: { tenantId } }),
      db.asset.count({ where: { tenantId, status: "ACTIVE" } }),
      db.asset.count({ where: { tenantId, status: "MAINTENANCE" } }),
      db.asset.count({ where: { tenantId, status: "RETIRED" } }),
    ]);

    const totalValue = await db.asset.aggregate({
      where: { tenantId },
      _sum: { currentValue: true },
    });

    return {
      total,
      active,
      maintenance,
      retired,
      totalValue: totalValue._sum.currentValue?.toString() || "0",
    };
  }

  /**
   * Get assets by category
   */
  static async getByCategory(tenantId: string) {
    const assets = await db.asset.groupBy({
      by: ["category"],
      where: { tenantId },
      _count: true,
      _sum: { currentValue: true },
    });

    return assets.map(item => ({
      category: item.category,
      count: item._count,
      totalValue: item._sum.currentValue?.toString() || "0",
    }));
  }
}
