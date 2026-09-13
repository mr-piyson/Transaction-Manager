import { z } from "zod";
import { promises as fs } from "fs";
import { assertCan, orgProcedure, router } from "@/lib/trpc/context";
import * as storage from "../services/file/storage.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect all image/storagePath string fields across entities. */
async function collectImageRefs(db: any, orgId: string) {
  const refs: { entityType: string; entityId: string; field: string; imagePath: string }[] = [];

  const items = await db.item.findMany({
    where: { organizationId: orgId, image: { not: null } },
    select: { id: true, image: true },
  });
  for (const item of items) {
    if (item.image) {
      refs.push({ entityType: "Item", entityId: item.id, field: "image", imagePath: item.image });
    }
  }

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { logo: true, stampImage: true },
  });
  if (org?.logo) {
    refs.push({ entityType: "Organization", entityId: orgId, field: "logo", imagePath: org.logo });
  }
  if (org?.stampImage) {
    refs.push({ entityType: "Organization", entityId: orgId, field: "stampImage", imagePath: org.stampImage });
  }

  const users = await db.user.findMany({
    where: { organizationId: orgId, image: { not: null } },
    select: { id: true, image: true },
  });
  for (const user of users) {
    if (user.image) {
      refs.push({ entityType: "User", entityId: user.id, field: "image", imagePath: user.image });
    }
  }

  return refs;
}

/** Build a Set of storagePaths referenced by image fields. */
function referencedPaths(refs: { imagePath: string }[]): Set<string> {
  return new Set(refs.map((r) => r.imagePath));
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const storageRouter = router({
  /**
   * Scan the filesystem and database for storage inconsistencies.
   * Returns four categories of issues.
   */
  scan: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, "org:settings:read", "Organization", {
      organizationId: ctx.user.organizationId,
    });

    const orgId = ctx.user.organizationId;

    // 1. Get all File records from DB
    const dbFiles = await ctx.db.file.findMany({
      select: { id: true, filename: true, storagePath: true, size: true, originalName: true, mime: true },
    });

    // 2. Get all disk files
    const diskFiles = await storage.listAllFiles();
    const diskPathSet = new Set(diskFiles.map((f) => f.storagePath));

    // 3. Get all image refs
    const imageRefs = await collectImageRefs(ctx.db, orgId);
    const refPathSet = referencedPaths(imageRefs);

    // 4. Get all attachment fileIds
    const attachmentFileIds = new Set(
      (
        await ctx.db.attachment.findMany({
          where: { organizationId: orgId },
          select: { fileId: true },
        })
      ).map((a: { fileId: string }) => a.fileId),
    );

    // --- Category 1: Orphaned DB records (File exists in DB but file missing on disk) ---
    const orphanedDbRecords: {
      id: string;
      filename: string;
      storagePath: string;
      size: number;
      originalName: string;
      mime: string;
    }[] = [];

    for (const dbFile of dbFiles) {
      const onDisk = diskPathSet.has(dbFile.storagePath);
      if (!onDisk) {
        orphanedDbRecords.push({
          id: dbFile.id,
          filename: dbFile.filename,
          storagePath: dbFile.storagePath,
          size: dbFile.size,
          originalName: dbFile.originalName,
          mime: dbFile.mime,
        });
      }
    }

    // --- Category 2: Orphaned disk files (file exists on disk but no DB record) ---
    const dbStoragePaths = new Set(dbFiles.map((f) => f.storagePath));
    const orphanedDiskFiles: {
      storagePath: string;
      size: number;
    }[] = [];

    for (const diskFile of diskFiles) {
      if (!dbStoragePaths.has(diskFile.storagePath)) {
        orphanedDiskFiles.push({
          storagePath: diskFile.storagePath,
          size: diskFile.size,
        });
      }
    }

    // --- Category 3: Unused files (File in DB with no attachments AND not referenced by image fields) ---
    const unusedFiles: {
      id: string;
      filename: string;
      storagePath: string;
      size: number;
      originalName: string;
      mime: string;
    }[] = [];

    for (const dbFile of dbFiles) {
      if (!diskPathSet.has(dbFile.storagePath)) continue; // already in orphanedDbRecords
      const hasAttachment = attachmentFileIds.has(dbFile.id);
      const isReferenced = refPathSet.has(dbFile.storagePath);
      if (!hasAttachment && !isReferenced) {
        unusedFiles.push({
          id: dbFile.id,
          filename: dbFile.filename,
          storagePath: dbFile.storagePath,
          size: dbFile.size,
          originalName: dbFile.originalName,
          mime: dbFile.mime,
        });
      }
    }

    // --- Category 4: Dangling image refs (image field points to missing file) ---
    const danglingImageRefs: {
      entityType: string;
      entityId: string;
      field: string;
      imagePath: string;
    }[] = [];

    for (const ref of imageRefs) {
      const exists = await storage.exists(ref.imagePath);
      if (!exists) {
        danglingImageRefs.push(ref);
      }
    }

    const totalSize = diskFiles.reduce((sum, f) => sum + f.size, 0);

    return {
      orphanedDbRecords,
      orphanedDiskFiles,
      unusedFiles,
      danglingImageRefs,
      totalFiles: diskFiles.length,
      totalSize,
      summary: {
        orphanedDbRecords: orphanedDbRecords.length,
        orphanedDiskFiles: orphanedDiskFiles.length,
        unusedFiles: unusedFiles.length,
        danglingImageRefs: danglingImageRefs.length,
      },
    };
  }),

  /**
   * Remove a specific File record + its physical file + nullify any image refs.
   * Also deletes all Attachments pointing to this file.
   */
  removeFile: orgProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, "org:settings:update", "Organization", {
        organizationId: ctx.user.organizationId,
      });

      const orgId = ctx.user.organizationId;
      const file = await ctx.db.file.findUnique({ where: { id: input.fileId } });
      if (!file) return { removed: false };

      // Remove all attachments for this file
      await ctx.db.attachment.deleteMany({ where: { fileId: file.id } });

      // Nullify image refs that point to this storagePath
      await ctx.db.item.updateMany({
        where: { organizationId: orgId, image: file.storagePath },
        data: { image: null },
      });
      await ctx.db.organization.updateMany({
        where: { id: orgId, OR: [{ logo: file.storagePath }, { stampImage: file.storagePath }] },
        data: { logo: null, stampImage: null },
      });
      await ctx.db.user.updateMany({
        where: { organizationId: orgId, image: file.storagePath },
        data: { image: null },
      });

      // Delete physical file
      await storage.remove(file.storagePath);

      // Delete DB record
      await ctx.db.file.delete({ where: { id: file.id } });

      return { removed: true };
    }),

  /**
   * Delete an orphaned physical file from disk (no DB record).
   */
  removeDiskFile: orgProcedure
    .input(z.object({ storagePath: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, "org:settings:update", "Organization", {
        organizationId: ctx.user.organizationId,
      });

      const removed = await storage.remove(input.storagePath);
      return { removed };
    }),

  /**
   * Nullify an image/storagePath reference on an entity.
   */
  removeImageRef: orgProcedure
    .input(
      z.object({
        entityType: z.enum(["Item", "Organization", "User"]),
        entityId: z.string(),
        field: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, "org:settings:update", "Organization", {
        organizationId: ctx.user.organizationId,
      });

      const data: Record<string, null> = { [input.field]: null };

      switch (input.entityType) {
        case "Item":
          await ctx.db.item.update({ where: { id: input.entityId }, data });
          break;
        case "Organization":
          await ctx.db.organization.update({ where: { id: input.entityId }, data });
          break;
        case "User":
          await ctx.db.user.update({ where: { id: input.entityId }, data });
          break;
      }

      return { removed: true };
    }),

  /**
   * Bulk-remove all unused File records (no attachments, no image refs)
   * and their physical files.
   */
  removeOrphanedRecords: orgProcedure.mutation(async ({ ctx }) => {
    assertCan(ctx.ability, "org:settings:update", "Organization", {
      organizationId: ctx.user.organizationId,
    });

    const orgId = ctx.user.organizationId;

    // Find all files referenced by attachments or image fields
    const attachmentFileIds = (
      await ctx.db.attachment.findMany({
        where: { organizationId: orgId },
        select: { fileId: true },
      })
    ).map((a: { fileId: string }) => a.fileId);

    const imageRefs = await collectImageRefs(ctx.db, orgId);
    const refPaths = referencedPaths(imageRefs);

    // Find all files
    const allFiles = await ctx.db.file.findMany({
      select: { id: true, storagePath: true },
    });

    const unusedFileIds: string[] = [];
    const unusedPaths: string[] = [];

    for (const file of allFiles) {
      const hasAttachment = attachmentFileIds.includes(file.id);
      const isReferenced = refPaths.has(file.storagePath);
      if (!hasAttachment && !isReferenced) {
        unusedFileIds.push(file.id);
        unusedPaths.push(file.storagePath);
      }
    }

    // Delete attachments for unused files (should be 0, but be safe)
    if (unusedFileIds.length > 0) {
      await ctx.db.attachment.deleteMany({
        where: { fileId: { in: unusedFileIds } },
      });

      // Delete physical files
      for (const p of unusedPaths) {
        await storage.remove(p);
      }

      // Delete DB records
      await ctx.db.file.deleteMany({
        where: { id: { in: unusedFileIds } },
      });
    }

    return { removed: unusedFileIds.length };
  }),

  /**
   * One-click cleanup: remove all orphaned records, orphaned disk files,
   * and fix all dangling image refs.
   */
  cleanAll: orgProcedure.mutation(async ({ ctx }) => {
    assertCan(ctx.ability, "org:settings:update", "Organization", {
      organizationId: ctx.user.organizationId,
    });

    const orgId = ctx.user.organizationId;
    let recordsRemoved = 0;
    let diskFilesRemoved = 0;
    let refsFixed = 0;

    // 1. Get all File records
    const dbFiles = await ctx.db.file.findMany({
      select: { id: true, storagePath: true },
    });

    // 2. Get all disk files
    const diskFiles = await storage.listAllFiles();
    const diskPathSet = new Set(diskFiles.map((f) => f.storagePath));

    // 3. Get image refs
    const imageRefs = await collectImageRefs(ctx.db, orgId);

    // 4. Get attachment fileIds
    const attachmentFileIds = new Set(
      (
        await ctx.db.attachment.findMany({
          where: { organizationId: orgId },
          select: { fileId: true },
        })
      ).map((a: { fileId: string }) => a.fileId),
    );

    // --- Remove orphaned DB records ---
    for (const dbFile of dbFiles) {
      if (!diskPathSet.has(dbFile.storagePath)) {
        await ctx.db.attachment.deleteMany({ where: { fileId: dbFile.id } });
        await ctx.db.file.delete({ where: { id: dbFile.id } });
        recordsRemoved++;
      }
    }

    // --- Remove orphaned disk files ---
    const dbStoragePaths = new Set(dbFiles.map((f) => f.storagePath));
    for (const diskFile of diskFiles) {
      if (!dbStoragePaths.has(diskFile.storagePath)) {
        await storage.remove(diskFile.storagePath);
        diskFilesRemoved++;
      }
    }

    // --- Fix dangling image refs ---
    for (const ref of imageRefs) {
      const exists = await storage.exists(ref.imagePath);
      if (!exists) {
        const data: Record<string, null> = { [ref.field]: null };
        switch (ref.entityType) {
          case "Item":
            await ctx.db.item.update({ where: { id: ref.entityId }, data });
            break;
          case "Organization":
            await ctx.db.organization.update({ where: { id: ref.entityId }, data });
            break;
          case "User":
            await ctx.db.user.update({ where: { id: ref.entityId }, data });
            break;
        }
        refsFixed++;
      }
    }

    // --- Remove unused files (no attachments, no image refs) ---
    // Re-fetch after cleanup
    const remainingFiles = await ctx.db.file.findMany({
      select: { id: true, storagePath: true },
    });

    const newAttachmentIds = new Set(
      (
        await ctx.db.attachment.findMany({
          where: { organizationId: orgId },
          select: { fileId: true },
        })
      ).map((a: { fileId: string }) => a.fileId),
    );

    const newImageRefs = await collectImageRefs(ctx.db, orgId);
    const newRefPaths = referencedPaths(newImageRefs);

    const unusedIds: string[] = [];
    const unusedPaths: string[] = [];

    for (const file of remainingFiles) {
      if (!diskPathSet.has(file.storagePath)) continue;
      const hasAttachment = newAttachmentIds.has(file.id);
      const isReferenced = newRefPaths.has(file.storagePath);
      if (!hasAttachment && !isReferenced) {
        unusedIds.push(file.id);
        unusedPaths.push(file.storagePath);
      }
    }

    if (unusedIds.length > 0) {
      await ctx.db.attachment.deleteMany({ where: { fileId: { in: unusedIds } } });
      for (const p of unusedPaths) {
        await storage.remove(p);
      }
      await ctx.db.file.deleteMany({ where: { id: { in: unusedIds } } });
      recordsRemoved += unusedIds.length;
    }

    return {
      recordsRemoved,
      diskFilesRemoved,
      refsFixed,
      total: recordsRemoved + diskFilesRemoved + refsFixed,
    };
  }),
});
