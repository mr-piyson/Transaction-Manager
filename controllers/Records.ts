import db from "@/lib/database";
import { Customer, User } from "@/types/prisma/client";

class Customers {
  static async getAllCustomers() {
    return await db.customer.findMany({});
  }

  static async updateCustomer(customer: Customer) {
    return await db.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        ...customer,
      },
    });
  }

  static async deleteCustomer(customer: Customer, user: User) {
    return await db.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        deletedAt: new Date(),
        deletedBy: user.id,
      },
    });
  }

  static async createNewRecord(customer: Omit<Customer, "id">, user: User) {
    return await db.customer.create({
      data: {
        ...customer,
      },
    });
  }
}
