import { PrismaClient } from '@prisma/client';
import { purchaseOrderRouter } from './server/purchase-orders';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();
  const user = await prisma.user.findFirst();
  const supplier = await prisma.supplier.findFirst();
  const warehouse = await prisma.warehouse.findFirst();
  const item = await prisma.item.findFirst();

  if (!org || !user || !supplier || !warehouse || !item) {
    console.log("Missing data");
    return;
  }

  const caller = purchaseOrderRouter.createCaller({
    prisma,
    user: user as any,
    organizationId: org.id,
    session: {} as any,
  });

  try {
    const res = await caller.create({
      supplierId: supplier.id,
      warehouseId: warehouse.id,
      lines: [{
        itemId: item.id,
        description: "Test",
        quantity: 1,
        unitCost: 100,
        taxAmt: 0
      }]
    });
    console.log("Success:", res);
  } catch (e) {
    console.error("Error:", e);
  }
}
main().finally(() => prisma.$disconnect());
