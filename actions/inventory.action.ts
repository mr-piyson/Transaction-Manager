import db from "@/lib/database";

export const inventoryAction = {
  async getAll(query: { page?: number; limit?: number; search?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { code: { contains: query.search, mode: "insensitive" as const } },
            {
              description: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : undefined;

    const [items, total] = await Promise.all([
      db.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      db.inventoryItem.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  async getById(id: number) {
    const item = await db.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new Error("Inventory item not found");
    return item;
  },

  async create(data: {
    code?: string;
    name: string;
    description: string;
    purchasePrice: number;
    salesPrice: number;
    image?: string;
  }) {
    return db.inventoryItem.create({ data });
  },

  async update(
    id: number,
    data: {
      code?: string;
      name?: string;
      description?: string;
      purchasePrice?: number;
      salesPrice?: number;
      image?: string;
    },
  ) {
    return db.inventoryItem.update({ where: { id }, data });
  },

  async delete(id: number) {
    await db.inventoryItem.delete({ where: { id } });
    return { success: true };
  },
};
