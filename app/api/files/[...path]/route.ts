import { fileTypeFromBuffer } from "file-type";
import { type NextRequest, NextResponse } from "next/server";
import { getRequestAuth } from "@/lib/permissions/server";
import { readByStoragePath } from "@/server/services/file/storage.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  // Gate file streaming on an authenticated org member. `/uploads/*` is
  // rewritten here, and image URLs are same-origin so the session cookie is
  // always present on legitimate requests.
  const auth = await getRequestAuth();
  if (!auth?.user.organizationId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const segments = (await params).path;

  if (!segments || segments.length === 0) {
    return NextResponse.json({ error: "Missing file path" }, { status: 400 });
  }

  // Rows uploaded on Windows may store `\` as a separator (e.g. `2026\08`);
  // treat it like a regular separator, then re-check for traversal.
  const parts = segments
    .flatMap((s) => s.split(/[\\/]+/))
    .filter((s) => s !== "" && s !== ".");

  if (parts.length === 0 || parts.some((s) => s === "..")) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  const storagePath = `/uploads/${parts.join("/")}`;
  const buffer = await readByStoragePath(storagePath);

  if (!buffer) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const detected = await fileTypeFromBuffer(buffer);
  const contentType = detected?.mime ?? "application/octet-stream";

  const body = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=86400",
      "Content-Disposition": "inline",
    },
  });
}
