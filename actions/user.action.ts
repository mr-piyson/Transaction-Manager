import db from "@/lib/database";
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

export const userAction = {
  async getAll(query: { page?: number; limit?: number; role?: Role }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      db.user.findMany({
        where: query.role ? { role: query.role } : undefined,
        skip,
        take: limit,
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
      }),
      db.user.count({
        where: query.role ? { role: query.role } : undefined,
      }),
    ]);

    return { users, total, page, limit };
  },

  async getById(id: string) {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new Error("User not found");
    return user;
  },

  async update(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      role?: Role;
      isActive?: boolean;
      password?: string;
    },
  ) {
    const { password, ...rest } = data;
    const updateData: any = { ...rest };
    if (password) {
      updateData.passwordHash = await hash(password, 12);
    }
    return db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  },

  async delete(id: string) {
    await db.tokens.deleteMany({ where: { userId: id } });
    await db.user.delete({ where: { id } });
    return { success: true };
  },
};
