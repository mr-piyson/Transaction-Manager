# File Upload Module

A self-contained file upload subsystem: magic-byte MIME validation, SHA-256
deduplication, image optimization, date-partitioned disk storage, authenticated
streaming, and reference-counted garbage collection.

This document describes how it works and how to port it to another app.

---

## 1. What it does

| Capability | Behavior |
|---|---|
| Upload | Multipart `POST`, max 10 MB, MIME detected from binary content (not the client `Content-Type` header) |
| Deduplication | SHA-256 of raw bytes; identical content returns the existing `File` row and never rewrites disk |
| Image optimization | JPEG/PNG/WebP re-encoded at quality 80 via `sharp`; dimensions recorded |
| Storage | `DATA_DIR/uploads/YYYY/MM/<cuid2>.<ext>`, deliberately outside `public/` |
| Serving | `GET /api/files/[...path]` (aliased as `/uploads/*`) behind session auth, streams with detected MIME and a 1-day private cache |
| Deletion | Explicit `DELETE`, or reference-counted GC when the last attachment is removed |
| Attachments | Polymorphic `Attachment` rows link a `File` to any entity (`Invoice`, `Customer`, ...) |

---

## 2. Architecture at a glance

```
Browser
  │  POST /api/uploads  (multipart, field "file")
  ▼
app/api/uploads/route.ts ──► server/services/file/upload.service.ts
                                   │
                                   ├─► hash.service.ts        (SHA-256)
                                   ├─► file.repository.ts     (dedupe lookup)
                                   ├─► image.service.ts       (sharp optimize)
                                   └─► storage.service.ts     (write to disk)
                                            │
                                            ▼
                                   Prisma: File / Attachment

Browser
  │  GET /uploads/2026/11/<id>.jpg   (next.config rewrite)
  ▼
app/api/files/[...path]/route.ts ──► storage.service.readByStoragePath()
                                          │
                                          ├─ DATA_DIR/uploads/...   (current)
                                          └─ public/uploads/...     (legacy fallback)
```

**Write path and read path are independent.** Upload writes to `DATA_DIR`; the
read route tries `DATA_DIR` first, then the legacy `public/uploads` root. Images
are referenced everywhere as a plain `storagePath` string (`/uploads/2026/11/x.jpg`),
so rendering is just `<img src={storagePath} />`.

---

## 3. Files

```
app/api/uploads/route.ts              POST (upload) + DELETE (remove)
app/api/files/[...path]/route.ts      GET (stream bytes)
next.config.ts                        /uploads/:path* → /api/files/:path*

server/services/file/
  upload.service.ts                   Orchestrator: validate → dedupe → optimize → store → persist
  storage.service.ts                  Disk I/O, path safety, date partitioning, legacy fallback
  hash.service.ts                     5-line SHA-256 helper
  image.service.ts                    sharp re-encode + dimensions (+ unused thumbnail)
  file.repository.ts                  Prisma queries for File + Attachment + orphan checks
  attachment.service.ts               Create/list/delete attachments with GC
server/attachments/attachments.router.ts   tRPC surface (optional)
```

---

## 4. Data model

Add these two Prisma models. They are the only schema requirement.

```prisma
model File {
  id           String       @id @default(cuid())
  filename     String       // generated name, e.g. "clx...a1.jpg"
  originalName String       // user's filename
  hash         String       @unique // SHA-256 hex of the RAW uploaded bytes
  storagePath  String       @unique // "/uploads/2026/11/<filename>"
  mime         String       // detected MIME, not user-supplied
  extension    String
  size         Int          // bytes AFTER optimization
  width        Int?
  height       Int?
  createdAt    DateTime     @default(now())
  attachments  Attachment[]

  @@schema("public") // remove if you don't use Prisma multiSchema
}

model Attachment {
  id             String   @id @default(cuid())
  fileId         String
  file           File     @relation(fields: [fileId], references: [id])
  entityType     String   // "Invoice", "Customer", ...
  entityId       String
  field          String?  // semantic role, e.g. "signature"
  label          String?  // display label
  uploadedById   String?
  organizationId String
  createdAt      DateTime @default(now())

  @@index([entityType, entityId])
  @@index([organizationId])
  @@index([fileId])
  @@schema("public")
}
```

Notes:

- `File` intentionally has **no** `organizationId`. Deduplication is global: two
  tenants uploading the same bytes share one physical file. If that is
  unacceptable in your app, add `organizationId` and make the unique constraint
  `@@unique([hash, organizationId])`, then pass the tenant id down into
  `uploadFile()`.
- `hash` is computed on the **raw** buffer. `size` is stored from the
  **processed** buffer. They can differ; that is expected.

---

## 5. Configuration

### Environment

```env
DATA_DIR=.data          # default; uploads land in $DATA_DIR/uploads
```

Resolved once in `storage.service.ts`:

```ts
const DATA_ROOT   = path.resolve(env.DATA_DIR);
const UPLOAD_ROOT = path.join(DATA_ROOT, "uploads");
const LEGACY_ROOT = path.resolve("public"); // drop this in a new app
```

`DATA_DIR` must be a **persistent, writable** path in production (a mounted
volume, not the container's ephemeral layer).

### Dependencies

```bash
pnpm add file-type sharp @paralleldrive/cuid2
# plus your ORM of choice (this module uses Prisma)
```

`file-type` v22 is ESM-only. Fine inside a Next.js route/Node ESM project; on a
CommonJS host use `await import("file-type")`.

### Next.js rewrite

Without this, stored paths like `/uploads/...` would 404 — the bytes live outside
`public/`.

```ts
// next.config.ts
async rewrites() {
  return {
    beforeFiles: [
      { source: "/uploads/:path*", destination: "/api/files/:path*" },
    ],
  };
}
```

### Auth dependency

Both routes call `getRequestAuth()` from `@/lib/permissions/server`, which returns
the better-auth session (`auth.user.organizationId` must exist). Replace it with
your own session lookup; the only requirement is an authenticated principal.

---

## 6. API contract

### `POST /api/uploads`

```http
POST /api/uploads
Content-Type: multipart/form-data

file=<binary>
```

Success `200`:

```json
{
  "message": "File uploaded successfully",
  "id": "clx...",
  "storagePath": "/uploads/2026/11/clx...a1.jpg",
  "originalName": "photo.jpg",
  "mime": "image/jpeg",
  "extension": "jpg",
  "size": 184320,
  "width": 1600,
  "height": 900
}
```

| Status | When |
|---|---|
| 400 | No `file` field |
| 401 | No session |
| 403 | Session without `organizationId` |
| 500 | Size limit exceeded, disk error, DB error (message passed through) |

### `DELETE /api/uploads`

```http
DELETE /api/uploads?fileId=<id>
DELETE /api/uploads?storagePath=/uploads/2026/11/x.jpg
```

Deletes the `File` row **and** the disk file only if nothing still references it.
Returns `200 { "message": "File deleted successfully" }` even when the record was
already gone (`storagePath` variant is idempotent).

### `GET /uploads/**` (→ `/api/files/**`)

- `401` unauthenticated / no org
- `400` empty or traversal-containing path
- `404` file missing on disk
- `200` body with `Content-Type` re-detected via `file-type`,
  `Cache-Control: private, max-age=86400`, `Content-Disposition: inline`

---

## 7. Request flow detail

### 7.1 Upload (`upload.service.ts`)

```ts
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function uploadFile(file: File): Promise<UploadResult> {
  if (file.size > MAX_FILE_SIZE) throw new Error(...);

  const rawBuffer = Buffer.from(await file.arrayBuffer());

  // 1. Trust bytes, not headers
  const detected  = await fileTypeFromBuffer(rawBuffer);
  const mime      = detected?.mime ?? file.type ?? "application/octet-stream";
  const extension = detected?.ext  ?? extensionFromMime(mime);

  // 2. Dedupe
  const hash     = computeSha256(rawBuffer);
  const existing = await fileRepo.findByHash(hash);
  if (existing) return { ...existing };   // no disk write

  // 3. Optimize (no-op for non-images)
  const { buffer: processedBuffer, metadata } = await processImage(rawBuffer, mime);

  // 4. Store
  const filename = `${createId()}.${extension}`;
  const { storagePath } = await storage.write(processedBuffer, filename);

  // 5. Persist
  const fileRecord = await fileRepo.createFile({
    filename,
    originalName: file.name,
    hash,
    storagePath,
    mime,
    extension,
    size: processedBuffer.length,
    width:  metadata?.width  ?? null,
    height: metadata?.height ?? null,
  });

  return { ...fileRecord };
}
```

`extensionFromMime()` maps the common office/document MIME types
(`pdf`, `doc(x)`, `xls(x)`, `txt`, `csv`, `zip`, `svg`, ...) and falls back to
`bin`. It exists because `file-type` cannot sniff plain text and many office
formats resolve late.

### 7.2 Storage (`storage.service.ts`)

- `write()` creates `uploads/YYYY/MM/` with `mkdir -p`, writes the file, and
  returns both the public-ish `storagePath` and the `absolutePath`.
- `datePath()` deliberately builds `YYYY/MM` with a literal `/` instead of
  `path.join`, because on Windows `path.join` emits `\` and that separator would
  leak into stored URLs.
- `toAbsolute()` is the security boundary: normalize `\` → `/`, strip leading
  slashes, `path.resolve`, then reject anything where the relative path is empty,
  starts with `..`, or is absolute.
- `readByStoragePath()` tries `DATA_ROOT` then `LEGACY_ROOT` and returns `null`
  when both miss. `remove()` and `exists()` do the same two-root walk.
- `listAllFiles()` recursively enumerates both roots — useful for an orphan
  sweeper (not wired to a route in this repo).

### 7.3 Image processing (`image.service.ts`)

- Non-images pass through untouched (SVG is explicitly excluded).
- `sharp` reads dimensions; if width/height are missing, the original is kept.
- JPEG → `jpeg({ quality: 80, mozjpeg: true })`
- PNG → `png({ quality: 80, compressionLevel: 8 })`
- WebP → `webp({ quality: 80 })`
- Any other `image/*` → original bytes, dimensions still recorded.
- A 128 px WebP thumbnail is generated but **the upload service ignores it**
  (the result is destructured as `{ buffer, metadata }`). If you want thumbnails,
  add a `thumbnailPath` column and write it yourself.

Re-encoding strips EXIF (including GPS) — a privacy win, but also strips
orientation; add `.rotate()` before encoding if you need to honor EXIF rotation.

### 7.4 Serving (`app/api/files/[...path]/route.ts`)

1. Require `auth.user.organizationId` → else `401`.
2. Split the catch-all segments on both `/` and `\` (Windows-era rows store
   `2026\08`), drop empty and `.` parts.
3. Reject empty result or any `..` part → `400`.
4. Rebuild `storagePath = "/uploads/" + parts.join("/")` and read from disk.
5. Detect MIME from the bytes again (never trust the DB or client).
6. Return a sliced `ArrayBuffer` (Node `Buffer` is a view into a pooled
   allocation; slicing avoids leaking the whole pool) with `Content-Length`,
   `Cache-Control: private, max-age=86400`, `Content-Disposition: inline`.

### 7.5 Deletion & garbage collection

Two entry points:

```ts
deleteUpload(fileId)               // DELETE ?fileId=...
deleteUploadByStoragePath(path)    // DELETE ?storagePath=... (idempotent)
```

Both call `fileRepo.deleteFileIfOrphaned(id, storagePath)`, which counts
references across:

- `Attachment.file.storagePath`
- `Item.image`
- `Organization.logo` / `Organization.stampImage`
- `User.image`

Only when that total is `0` is the `File` row deleted, and only then does
`storage.remove()` unlink the bytes.

`attachment.service.deleteAttachment()` and `deleteByEntity()` delete the
attachment row and then GC the file the same way.

---

## 8. Frontend usage

Upload and keep the returned `storagePath`:

```ts
const formData = new FormData();
formData.append("file", file);

const res = await fetch("/api/uploads", { method: "POST", body: formData });
if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Upload failed");

const { storagePath } = await res.json();
// persist storagePath on your entity, render with <img src={storagePath} />
```

Clean up a just-uploaded file the user abandoned (e.g. import wizard):

```ts
await fetch(`/api/uploads?fileId=${encodeURIComponent(fileId)}`, {
  method: "DELETE",
});
```

Replace an image (upload new, delete old, best effort):

```ts
const next = await upload(newFile);
if (old && old !== next) await fetch(`/api/uploads?storagePath=${encodeURIComponent(old)}`, { method: "DELETE" });
```

A ready-made `markForCleanup` / `cleanupUploadedFiles` set-based helper lives in
`app/(dashboard)/erp/items/import/upload-cleanup.ts` if you need batch rollback.

---

## 9. Attachments (polymorphic links)

Skip this layer if a single `image` string column per entity is enough.

```ts
await attachmentService.createAttachment({
  fileId,
  entityType: "Invoice",
  entityId,
  field: "signature",     // optional role
  label: "Signed copy",   // optional display label
  uploadedById,
  organizationId,
});

await attachmentService.listByEntity("Invoice", invoiceId); // includes file
await attachmentService.deleteAttachment(attachmentId);     // GCs the File
await attachmentService.deleteByEntity("Invoice", invoiceId);
```

The included tRPC router (`server/attachments/attachments.router.ts`) wraps these
with `orgProcedure` and permission codes (`invoice:create` / `invoice:delete`).
For another app, expose them through whatever transport you already use.

---

## 10. Porting checklist

1. **Install deps**: `file-type`, `sharp`, `cuid2` (or swap `createId()` for
   `crypto.randomUUID()`).
2. **Add the schema** (`File`, `Attachment`) and run your migration. Drop
   `@@schema("public")` and the `organizationId` field if you don't need
   multi-tenancy.
3. **Copy the six service files** verbatim; they have no Next.js imports.
4. **Replace the env import** in `storage.service.ts`:
   `import { env } from "@/lib/env"` → `process.env.DATA_DIR ?? ".data"`.
5. **Replace `db`** in `file.repository.ts` with your ORM/client. The repo layer
   is the only place that touches the database.
6. **Replace `NotFoundError`** in `upload.service.ts` (used by `deleteUpload`)
   with your error type, or `throw new Error(...)`.
7. **Drop `LEGACY_ROOT`** and simplify `read/remove/exists/resolveAbsolute` to a
   single root if there is no `public/uploads` history to support.
8. **Add the two routes** (upload + streaming) and the `/uploads/*` rewrite.
   Both assumed a catch-all route; in Express this is
   `app.get("/uploads/*", ...)` + `app.post("/api/uploads", ...)`.
9. **Port the auth check**: replace `getRequestAuth()` with your session lookup;
   keep the `organizationId` gate if you are multi-tenant.
10. **Adapt `extensionFromMime`** to the formats you actually accept.
11. **Verify `sharp`** installs on your target (it ships prebuilt binaries; Alpine
    needs `libc6-compat`).
12. **Test** with §12.

What to keep vs rewrite:

| Keep as-is | Rewrite |
|---|---|
| `hash.service.ts` | env import in `storage.service.ts` |
| `image.service.ts` | `db` calls in `file.repository.ts` |
| `storage.service.ts` path logic | auth in both route handlers |
| route body/response shapes | `NotFoundError` import |
| dedupe + orphan-GC logic | framework glue (Next rewrite → your router) |

---

## 11. Security properties and gotchas

**Good by design**

- MIME comes from magic bytes, not the client header, on both upload and serve.
- Path traversal is blocked twice: in the route (rejecting `..` segments) and
  again in `toAbsolute()` (resolving and checking the relative path).
- Uploads are not under `public/`, so nothing is served without passing the
  auth-gated route.
- Re-encoding strips EXIF metadata.
- Files are only unlinked when a reference count reaches zero.

**Watch out for**

- **No per-file tenancy.** `hash` is globally unique, so identical bytes from two
  orgs share one row; anyone with the `storagePath` and a valid session in *any*
  org can fetch it. Add `organizationId` to `File` if that matters.
- **`DELETE ?fileId=` is not org-scoped.** Any authenticated org member can ask
  to delete any file id. Add an ownership check in `requireSessionWithOrg()`'s
  spirit before calling the service.
- **Attachment GC is attachment-only.** `attachment.service.ts` calls
  `deleteFileIfOrphaned(fileId)` *without* `storagePath`, so it counts only
  attachments. A file also referenced by `Item.image` / `Organization.logo`
  can be deleted while those string columns still point at it. Pass
  `attachment.file.storagePath` to make it check every reference source.
- **Oversize files return `500`, not `413`.** `uploadFile` throws a plain
  `Error`; the route maps every throw to `500`. Special-case it if you care.
- **Thumbnails are generated and discarded.** Pick one: persist them or delete
  the code.
- **`text/plain` and `text/csv` are not detectable** by `file-type`; they fall
  back to the client-declared `file.type`. That is the one place a client can
  influence the stored MIME. Acceptable for inert text, not for anything
  executable — and note nothing on this path executes uploads.
- **No rate limit, no size check on the streaming route, no virus scan.** Add
  these at your edge if you expose uploads publicly.
- **`DATA_DIR` must persist across deploys.** In Docker/Kubernetes, mount it.
  Standalone Next builds wipe the container filesystem otherwise.
- **Date partitioning is UTC-independent.** `datePath()` uses server-local time,
  so two servers in different timezones can write to different month folders.
  Harmless (paths are recorded), just not sorted strictly by UTC month.

---

## 12. Test checklist

- [ ] Upload a JPEG → file lands in `.data/uploads/YYYY/MM/`, `mime` is
      `image/jpeg`, dimensions recorded, size shrinks.
- [ ] Upload the **same** JPEG twice → second response has the same `id` and
      `storagePath`, no new file on disk.
- [ ] Upload a `.txt` → succeeds; `mime` comes from `file.type`.
- [ ] Upload an 11 MB file → rejected.
- [ ] Rename a `.png` to `.jpg` → stored `mime` is still `image/png` (bytes win).
- [ ] Upload an SVG → stored untouched (not passed through `sharp`).
- [ ] `GET /uploads/<returned path>` while logged in → `200`, correct
      `Content-Type`.
- [ ] Same GET while logged out → `401`.
- [ ] `GET /uploads/../../etc/passwd` → `400`.
- [ ] `GET /uploads/2026/11/does-not-exist.jpg` → `404`.
- [ ] `DELETE ?fileId=` with no references → row and file gone.
- [ ] `DELETE ?fileId=` while an `Item.image` still points at it → row and file
      survive (verify the count query is wired).
- [ ] Delete the last attachment → its `File` and bytes are GC'd.
- [ ] Delete a second attachment on a shared `File` → file survives.
- [ ] Two orgs upload identical bytes → one physical file (confirm you accept
      that).

---

## 13. Minimal port for a non-Next, non-Prisma host

```
storage.service.ts ──┐
image.service.ts  ──┤   copy unchanged
hash.service.ts   ──┘

upload.service.ts ───── swap NotFoundError + File type (use Buffer + name + declaredType)

file.repository.ts ──── implement 8 functions against your DB:
                         findByHash, createFile, findById, findByStoragePath,
                         createAttachment, findAttachmentsByEntity,
                         deleteAttachment, deleteFileIfOrphaned
                         (+ countStoragePathReferences for full GC)

routes ─────────────── POST multipart, GET catch-all, DELETE by id/path
auth ───────────────── any session check that yields an org/tenant id
```

The Disk I/O, MIME detection, dedupe, optimization, and orphan logic carry over
without modification; only the framework and ORM seams change.
