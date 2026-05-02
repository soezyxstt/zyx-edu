import { randomUUID } from "node:crypto";
import * as z from "zod";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { db } from "@/db";
import { driveItem } from "@/db/schema";
import {
  assertFolderOrRoot,
  uniquifyName,
} from "@/lib/drive";
import { auth } from "@/lib/auth";

const f = createUploadthing();

const driveInputParser = z.object({
  parentId: z.string().nullable().optional(),
}).transform((v) => ({
  /** Normalized folder key; omit or null => My Drive root. */
  parentId: v.parentId ?? null,
}));

async function requireAdminUser(req: Request) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  const user = session?.user as { id: string; role?: string | null } | undefined;
  if (!user?.id) throw new UploadThingError("Unauthorized");
  if (user.role !== "admin") throw new UploadThingError("Admin only");
  return { userId: user.id };
}

export const uploadRouter = {
  driveUploader: f(
    {
      image: { maxFileSize: "16MB", maxFileCount: 80 },
      pdf: { maxFileSize: "64MB", maxFileCount: 40 },
      blob: { maxFileSize: "64MB", maxFileCount: 40 },
    },
    { awaitServerData: true },
  )
    .input(driveInputParser)
    .middleware(async ({ req, input }) => {
      const meta = await requireAdminUser(req);
      const parentId = input?.parentId ?? null;
      const okParent = await assertFolderOrRoot(parentId);
      if (!okParent) throw new UploadThingError("Invalid destination folder.");
      return { userId: meta.userId, parentId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const parentId = metadata.parentId;
      const resolvedName = await uniquifyName(parentId, file.name);
      const id = randomUUID();
      await db.insert(driveItem).values({
        id,
        parentId,
        kind: "file",
        name: resolvedName,
        uploadthingKey: file.key,
        ufsUrl: file.ufsUrl,
        mimeType: file.type || null,
        sizeBytes: file.size,
        createdByUserId: metadata.userId,
      });
      return { driveItemId: id };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
