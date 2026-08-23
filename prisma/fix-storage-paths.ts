/**
 * One-time data migration fixing Windows-style backslash separators inside
 * stored upload paths.
 *
 * Before the fix, `datePath()` used `path.join(yyyy, mm)`, which emits `\`
 * on Windows. That leaked into stored values such as:
 *   /uploads/2026\08/abc123.webp   → should be  /uploads/2026/08/abc123.webp
 *
 * This script rewrites affected rows to forward slashes across every column
 * that can hold an upload path:
 *   File.storagePath, Item.image, Organization.logo,
 *   Organization.stampImage, User.image
 *
 * Run with: bun run prisma/fix-storage-paths.ts
 *
 * Safe to run multiple times (idempotent).
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Mirrors lib/db.ts — Prisma 7 requires a driver adapter.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const db = new PrismaClient({ adapter });

const UPLOAD_PREFIX = "/uploads/";

function normalize(value: string): string {
  return value.replaceAll("\\", "/");
}

/** Only touches upload-backed paths; external URLs are left alone. */
function isAffected(value: string | null | undefined): value is string {
  return !!value && value.includes("\\") && value.startsWith(UPLOAD_PREFIX);
}

async function fixFiles(): Promise<number> {
  const rows = await db.file.findMany({
    where: { storagePath: { contains: "\\" } },
    select: { id: true, storagePath: true },
  });

  let fixed = 0;
  for (const row of rows) {
    if (!isAffected(row.storagePath)) continue;
    const next = normalize(row.storagePath);
    try {
      await db.file.update({
        where: { id: row.id },
        data: { storagePath: next },
      });
      fixed++;
    } catch {
      // P2002 unique violation: a normalized row already exists for this path.
      console.warn(`⚠ Skipped File ${row.id}: ${next} already exists`);
    }
  }
  console.log(`File.storagePath:        ${fixed} fixed`);
  return fixed;
}

async function fixItems(): Promise<number> {
  const rows = await db.item.findMany({
    where: { image: { contains: "\\" } },
    select: { id: true, image: true },
  });

  let fixed = 0;
  for (const row of rows) {
    if (!isAffected(row.image)) continue;
    await db.item.update({
      where: { id: row.id },
      data: { image: normalize(row.image) },
    });
    fixed++;
  }
  console.log(`Item.image:              ${fixed} fixed`);
  return fixed;
}

async function fixOrganizations(): Promise<number> {
  const rows = await db.organization.findMany({
    where: {
      OR: [{ logo: { contains: "\\" } }, { stampImage: { contains: "\\" } }],
    },
    select: { id: true, logo: true, stampImage: true },
  });

  let fixed = 0;
  for (const row of rows) {
    const data: { logo?: string; stampImage?: string } = {};
    if (isAffected(row.logo)) data.logo = normalize(row.logo);
    if (isAffected(row.stampImage)) data.stampImage = normalize(row.stampImage);
    if (Object.keys(data).length === 0) continue;
    await db.organization.update({ where: { id: row.id }, data });
    fixed++;
  }
  console.log(`Organization.logo/stamp: ${fixed} fixed`);
  return fixed;
}

async function fixUsers(): Promise<number> {
  const rows = await db.user.findMany({
    where: { image: { contains: "\\" } },
    select: { id: true, image: true },
  });

  let fixed = 0;
  for (const row of rows) {
    if (!isAffected(row.image)) continue;
    await db.user.update({
      where: { id: row.id },
      data: { image: normalize(row.image) },
    });
    fixed++;
  }
  console.log(`User.image:              ${fixed} fixed`);
  return fixed;
}

async function main() {
  console.log("Fixing Windows-style storage paths...\n");
  const total =
    (await fixFiles()) +
    (await fixItems()) +
    (await fixOrganizations()) +
    (await fixUsers());
  console.log(`\nDone. ${total} value(s) normalized.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
