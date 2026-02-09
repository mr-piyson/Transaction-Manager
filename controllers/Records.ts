import db from "@/lib/database";
import { Records, Users } from "@/types/prisma/client";

class Record {
  static async getAllCustomers() {
    return await db.records.findMany({});
  }

  static async updateCustomer(customer: Records) {
    return await db.records.update({
      where: {
        id: customer.id,
      },
      data: {
        ...customer,
      },
    });
  }

  static async deleteCustomer(customer: Records, user: Users) {
    return await db.records.update({
      where: {
        id: customer.id,
      },
      data: {
        deletedAt: new Date(),
        deletedBy: user.id,
      },
    });
  }

  static async createNewRecord(customer: Omit<Records, "id">, user: Users) {
    return await db.records.create({
      data: {
        ...customer,
      },
    });
  }
}
