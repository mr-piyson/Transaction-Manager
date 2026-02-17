import db from "@/lib/database";
import { Prisma } from "@prisma/client";

export interface CreateCustomerDTO {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
}

export interface UpdateCustomerDTO extends Partial<CreateCustomerDTO> {
  isActive?: boolean;
}

export class CustomerService {
  /**
   * Create new customer
   */
  static async create(tenantId: string, data: CreateCustomerDTO) {
    // Check if customer with email already exists in tenant
    const existing = await db.customer.findFirst({
      where: {
        email: data.email,
        tenantId,
      },
    });

    if (existing) {
      throw new Error("Customer with this email already exists");
    }

    return db.customer.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  /**
   * Get customer by ID
   */
  static async getById(id: string, tenantId: string) {
    const customer = await db.customer.findFirst({
      where: { id, tenantId },
      include: {
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            dueDate: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    return customer;
  }

  /**
   * List customers with pagination and filters
   */
  static async list(
    tenantId: string,
    filters: {
      search?: string;
      isActive?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const { search, isActive, page = 1, limit = 20 } = filters;

    const where: Prisma.CustomerWhereInput = {
      tenantId,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }, { phone: { contains: search, mode: "insensitive" } }],
      }),
    };

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.customer.count({ where }),
    ]);

    return { customers, total, page, limit };
  }

  /**
   * Update customer
   */
  static async update(id: string, tenantId: string, data: UpdateCustomerDTO) {
    // Verify customer belongs to tenant
    const customer = await db.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Check email uniqueness if changing email
    if (data.email && data.email !== customer.email) {
      const existing = await db.customer.findFirst({
        where: {
          email: data.email,
          tenantId,
          id: { not: id },
        },
      });

      if (existing) {
        throw new Error("Customer with this email already exists");
      }
    }

    return db.customer.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete customer (soft delete by setting isActive to false)
   */
  static async delete(id: string, tenantId: string) {
    const customer = await db.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    return db.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Get customer statistics
   */
  static async getStats(tenantId: string) {
    const [total, active, inactive] = await Promise.all([
      db.customer.count({ where: { tenantId } }),
      db.customer.count({ where: { tenantId, isActive: true } }),
      db.customer.count({ where: { tenantId, isActive: false } }),
    ]);

    return { total, active, inactive };
  }
}
