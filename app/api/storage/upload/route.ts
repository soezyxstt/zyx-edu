import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { driveItem } from "@/db/schema";
import { auth } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { uniquifyName, assertFolderOrRoot } from "@/lib/drive";

export async function POST(req: Request) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({
      headers: h,
    });
    const user = session?.user as { id: string; role?: string | null } | undefined;
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const parentIdRaw = formData.get("parentId") as string | null;
    const parentId = parentIdRaw === "null" || !parentIdRaw ? null : parentIdRaw;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const okParent = await assertFolderOrRoot(parentId);
    if (!okParent) {
      return NextResponse.json({ error: "Invalid destination folder" }, { status: 400 });
    }

    // Upload to active storage provider
    const uploadRes = await storage.upload(file, file.name, file.type);

    const resolvedName = await uniquifyName(parentId, file.name);
    const id = randomUUID();

    // Insert record into drive_item table
    await db.insert(driveItem).values({
      id,
      parentId,
      kind: "file",
      name: resolvedName,
      uploadthingKey: uploadRes.key,
      ufsUrl: uploadRes.url, // This is only the storage key!
      mimeType: file.type || null,
      sizeBytes: uploadRes.size,
      createdByUserId: user.id,
    });

    return NextResponse.json({
      success: true,
      driveItemId: id,
      key: uploadRes.key,
      url: storage.getUrl(uploadRes.key),
    });
  } catch (err: any) {
    console.error("Storage upload route error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
