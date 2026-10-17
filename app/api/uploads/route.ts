import { type NextRequest, NextResponse } from "next/server";
import { getRequestAuth } from "@/lib/permissions/server";
import {
  deleteUpload,
  deleteUploadByStoragePath,
  uploadFile,
} from "@/server/services/file/upload.service";

/**
 * Uploads are shared across modules (item images, invoice attachments, org
 * logo, …), so there is no single permission code to require here. Access is
 * gated on an authenticated user that belongs to an organization; the entity
 * procedures that reference the resulting file remain the real boundary.
 */
async function requireSessionWithOrg() {
  const auth = await getRequestAuth();
  if (!auth) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!auth.user.organizationId) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { auth };
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionWithOrg();
    if (session.error) return session.error;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await uploadFile(file);

    return NextResponse.json({
      message: "File uploaded successfully",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("[Upload Error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSessionWithOrg();
    if (session.error) return session.error;

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");
    const storagePath = searchParams.get("storagePath");

    if (!fileId && !storagePath) {
      return NextResponse.json(
        { error: "fileId or storagePath parameter is required" },
        { status: 400 },
      );
    }

    if (storagePath) {
      await deleteUploadByStoragePath(storagePath);
    } else {
      await deleteUpload(fileId!);
    }

    return NextResponse.json({ message: "File deleted successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    console.error("[Delete Error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
