import db from "@/lib/database";

export const organizationAction = {
  async get() {
    return db.organization.findFirst();
  },

  async upsert(data: {
    name: string;
    logo?: string;
    address?: string;
    country?: string;
    website?: string;
    tax?: string;
  }) {
    const existing = await db.organization.findFirst();
    if (existing) {
      return db.organization.update({ where: { id: existing.id }, data });
    }
    return db.organization.create({ data });
  },
};
