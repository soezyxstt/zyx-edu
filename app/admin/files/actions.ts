"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { driveItem } from "@/db/schema";
import {
  assertFolderOrRoot,
  folderWouldMoveIntoSelfOrChild,
  nameTakenInFolder,
  uniquifyName,
} from "@/lib/drive";
import { assertAdmin } from "@/lib/uploadthing-admin";
import { utapi } from "@/lib/uploadthing-utapi";

const ADMIN_FILES_PATH = "/admin/files";

async function getRow(id: string) {
  const [row] = await db.select().from(driveItem).where(eq(driveItem.id, id)).limit(1);
  return row ?? null;
}

async function deleteSubtreeDeepFirst(id: string) {
  const children = await db.select({ id: driveItem.id }).from(driveItem).where(eq(driveItem.parentId, id));
  for (const c of children) {
    await deleteSubtreeDeepFirst(c.id);
  }
  const self = await getRow(id);
  if (!self) return;
  if (self.kind === "file" && self.uploadthingKey) {
    await utapi.deleteFiles(self.uploadthingKey);
  }
  await db.delete(driveItem).where(eq(driveItem.id, id));
}

function normalizeName(raw: string) {
  return raw.trim().replaceAll("\\", "").replaceAll("/", "").replace(/\0/g, "").slice(0, 200);
}

export async function driveCreateFolder(input: { parentId: string | null; name: string }) {
  try {
    const { user } = await assertAdmin();
    const name = normalizeName(input.name);
    if (!name) return { ok: false as const, error: "Name is required." };

    if (!(await assertFolderOrRoot(input.parentId))) {
      return { ok: false as const, error: "Invalid parent folder." };
    }

    if (await nameTakenInFolder(input.parentId, name)) {
      return { ok: false as const, error: "That name is already used in this folder." };
    }

    const id = randomUUID();
    await db.insert(driveItem).values({
      id,
      parentId: input.parentId,
      kind: "folder",
      name,
      createdByUserId: user.id,
    });
    revalidatePath(ADMIN_FILES_PATH);
    return { ok: true as const, id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false as const, error: msg };
  }
}

export async function driveRenameItem(input: { id: string; name: string }) {
  try {
    await assertAdmin();
    const name = normalizeName(input.name);
    if (!name) return { ok: false as const, error: "Name is required." };

    const row = await getRow(input.id);
    if (!row) return { ok: false as const, error: "Not found." };

    if (name !== row.name && (await nameTakenInFolder(row.parentId ?? null, name, row.id))) {
      return { ok: false as const, error: "That name is already used in this folder." };
    }

    if (row.kind === "file" && row.uploadthingKey && name !== row.name) {
      const renamed = await utapi.renameFiles({ fileKey: row.uploadthingKey, newName: name });
      if (!renamed.success) {
        return { ok: false as const, error: "Storage could not rename this file." };
      }
    }

    await db.update(driveItem).set({ name }).where(eq(driveItem.id, row.id));
    revalidatePath(ADMIN_FILES_PATH);
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false as const, error: msg };
  }
}

export async function driveDeleteItem(input: { id: string }) {
  try {
    await assertAdmin();
    const row = await getRow(input.id);
    if (!row) return { ok: false as const, error: "Not found." };
    await deleteSubtreeDeepFirst(row.id);
    revalidatePath(ADMIN_FILES_PATH);
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false as const, error: msg };
  }
}

export async function driveDeleteItems(input: { ids: string[] }) {
  try {
    await assertAdmin();
    const ids = [...new Set(input.ids.filter(Boolean))];
    if (!ids.length) return { ok: false as const, error: "Nothing to delete." };
    for (const id of ids) {
      const row = await getRow(id);
      if (!row) continue;
      await deleteSubtreeDeepFirst(row.id);
    }
    revalidatePath(ADMIN_FILES_PATH);
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false as const, error: msg };
  }
}

export async function driveMoveItems(input: { ids: string[]; targetParentId: string | null }) {
  try {
    await assertAdmin();
    if (!(await assertFolderOrRoot(input.targetParentId))) {
      return { ok: false as const, error: "Invalid destination folder." };
    }
    const ids = [...new Set(input.ids.filter(Boolean))];
    if (!ids.length) return { ok: false as const, error: "Nothing to move." };

    for (const id of ids) {
      const row = await getRow(id);
      if (!row) return { ok: false as const, error: "One or more items were not found." };

      const destParent = input.targetParentId;
      const currentParent = row.parentId ?? null;
      if (currentParent === destParent) continue;

      if (row.kind === "folder") {
        if (destParent === id) {
          return { ok: false as const, error: "Cannot move a folder into itself." };
        }
        if (await folderWouldMoveIntoSelfOrChild(id, destParent)) {
          return { ok: false as const, error: "Cannot move a folder into its own subfolder." };
        }
      }

      let newName = row.name;
      if (await nameTakenInFolder(destParent, row.name, row.id)) {
        newName = await uniquifyName(destParent, row.name);
        if (row.kind === "file" && row.uploadthingKey) {
          const renamed = await utapi.renameFiles({ fileKey: row.uploadthingKey, newName });
          if (!renamed.success) {
            return { ok: false as const, error: "Storage could not rename a file during move." };
          }
        }
      }

      await db
        .update(driveItem)
        .set({ parentId: destParent, name: newName })
        .where(eq(driveItem.id, row.id));
    }

    revalidatePath(ADMIN_FILES_PATH);
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false as const, error: msg };
  }
}
