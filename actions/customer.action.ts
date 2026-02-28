import db from "@/lib/database";

export const customerAction = {
  async getAll(query: { page?: number; limit?: number; search?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { phone: { contains: query.search } },
            { email: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      db.customer.count({ where }),
    ]);

    return { customers, total, page, limit };
  },

  async getById(id: number) {
    const customer = await db.customer.findUnique({
      where: { id },
      include: { invoices: { orderBy: { date: "desc" }, take: 10 } },
    });
    if (!customer) throw new Error("Customer not found");
    return customer;
  },

  async create(data: {
    name: string;
    phone: string;
    address: string;
    email?: string;
  }) {
    return db.customer.create({ data });
  },

  async update(
    id: number,
    data: { name?: string; phone?: string; address?: string; email?: string },
  ) {
    return db.customer.update({ where: { id }, data });
  },

  async delete(id: number) {
    await db.customer.delete({ where: { id } });
    return { success: true };
  },
};
