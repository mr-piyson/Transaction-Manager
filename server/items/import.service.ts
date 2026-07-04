import { writeAuditLog } from '../shared/audit.service';

export interface BulkItemInput {
  sku: string;
  name: string;
  description?: string;
  salesPrice?: number;
  purchasePrice?: number;
  unit?: string;
  minStock?: number;
  reorderPoint?: number;
  reorderQty?: number;
  barcode?: string;
  image?: string;
  categoryName?: string;
  taxRateId?: string;
}

export interface BulkImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ sku: string; error: string }>;
}

interface ImportDeps {
  db: any;
  organizationId: string;
  userId: string;
  ipAddress?: string;
}

async function resolveCategoryId(
  db: any,
  organizationId: string,
  categoryName: string,
): Promise<string | null> {
  if (!categoryName?.trim()) return null;

  const trimmed = categoryName.trim();
  const existing = await db.itemCategory.findFirst({
    where: { name: { equals: trimmed, mode: 'insensitive' }, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await db.itemCategory.create({
    data: { name: trimmed, organizationId },
    select: { id: true },
  });
  return created.id;
}

export async function bulkImportItems(
  inputItems: BulkItemInput[],
  updateExisting: boolean,
  deps: ImportDeps,
): Promise<BulkImportResult> {
  const { db, organizationId, userId, ipAddress } = deps;
  const result: BulkImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (const item of inputItems) {
    try {
      if (!item.sku?.trim()) {
        result.skipped++;
        result.errors.push({ sku: item.sku || '', error: 'SKU is required' });
        continue;
      }
      if (!item.name?.trim()) {
        result.skipped++;
        result.errors.push({ sku: item.sku, error: 'Name is required' });
        continue;
      }

      const categoryId = item.categoryName
        ? await resolveCategoryId(db, organizationId, item.categoryName)
        : undefined;

      const data = {
        sku: item.sku.trim(),
        name: item.name.trim(),
        description: item.description?.trim() || undefined,
        salesPrice: item.salesPrice ?? 0,
        purchasePrice: item.purchasePrice ?? 0,
        unit: item.unit?.trim() || 'pcs',
        minStock: item.minStock ?? 0,
        reorderPoint: item.reorderPoint ?? 0,
        reorderQty: item.reorderQty ?? 0,
        barcode: item.barcode?.trim() || undefined,
        image: item.image || undefined,
        categoryId: categoryId || undefined,
        taxRateId: item.taxRateId || undefined,
        organizationId,
        createdById: userId,
        updatedById: userId,
      };

      const existing = await db.item.findFirst({
        where: { sku: data.sku, organizationId, deletedAt: null },
        select: { id: true },
      });

      if (existing) {
        if (!updateExisting) {
          result.skipped++;
          result.errors.push({ sku: item.sku, error: 'SKU already exists (use updateExisting to overwrite)' });
          continue;
        }

        await db.item.update({
          where: { id: existing.id },
          data: { ...data, createdById: undefined },
        });

        await writeAuditLog(
          {
            entityType: 'Item',
            entityId: existing.id,
            action: 'UPDATE',
            organizationId,
            userId,
            ipAddress,
          },
          db,
        );

        result.updated++;
      } else {
        const created = await db.item.create({ data });

        await writeAuditLog(
          {
            entityType: 'Item',
            entityId: created.id,
            action: 'CREATE',
            organizationId,
            userId,
            ipAddress,
          },
          db,
        );

        result.created++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push({ sku: item.sku, error: message });
    }
  }

  return result;
}
