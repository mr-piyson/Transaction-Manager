import { type NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/server/services/file/upload.service";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_CONTENT_LENGTH = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body?.url;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "A valid image URL is required" },
        { status: 400 },
      );
    }

    // Only allow http/https
    let parsed: URL;
    try {
      parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("protocol");
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Fetch the image server-side
    const response = await fetch(parsed.href, {
      headers: { "User-Agent": "TransactionManager/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image (${response.status})` },
        { status: 502 },
      );
    }

    const contentType = response.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim();
    if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        {
          error:
            "URL does not point to a supported image type (JPEG, PNG, WebP, GIF)",
        },
        { status: 422 },
      );
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (contentLength > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: "Image exceeds 5 MB limit" },
        { status: 413 },
      );
    }

    // Convert to File object
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: "Image exceeds 5 MB limit" },
        { status: 413 },
      );
    }

    // Derive filename from URL or content-type
    const urlPath = parsed.pathname;
    const ext = urlPath.split(".").pop()?.toLowerCase();
    const extMap: Record<string, string> = {
      jpg: "jpg",
      jpeg: "jpg",
      png: "png",
      webp: "webp",
      gif: "gif",
    };
    const extension =
      ext && extMap[ext] ? extMap[ext] : (contentType.split("/")[1] ?? "jpg");
    const filename = `external-image.${extension}`;

    const file = new File([buffer], filename, { type: contentType });

    const result = await uploadFile(file);

    return NextResponse.json({
      message: "Image proxied and uploaded successfully",
      storagePath: result.storagePath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy failed";
    console.error("[ProxyImage]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
