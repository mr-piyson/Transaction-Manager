import db from "@/lib/database";
import { Customer, User } from "@/types/prisma/client";

async function getAllCustomers() {
  return await db.customer.findMany({});
}

async function updateCustomer(customer: Customer) {
  return await db.customer.update({
    where: {
      id: customer.id,
    },
    data: {
      ...customer,
    },
  });
}

async function createNewRecord(customer: Omit<Customer, "id">, user: User) {
  return await db.customer.create({
    data: {
      ...customer,
    },
  });
}
