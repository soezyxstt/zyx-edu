import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DriveExplorer } from "@/components/admin/drive-explorer";
import { assertFolderOrRoot, buildFolderTree, getBreadcrumbs, listAllFolders, listChildren } from "@/lib/drive";
import { pageTitle } from "@/lib/site";
import { assertAdmin } from "@/lib/uploadthing-admin";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: pageTitle("Files"),
  description: "Manage uploaded files and folders (admin).",
};

export default async function AdminFilesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  try {
    await assertAdmin();
  } catch {
    redirect("/");
  }

  const sp = await searchParams;
  const raw = sp.folder?.trim();
  const currentFolderId = raw && raw.length > 0 ? raw : null;

  if (currentFolderId && !(await assertFolderOrRoot(currentFolderId))) {
    redirect("/admin/files");
  }

  const [flatFolders, rows, breadcrumbs] = await Promise.all([
    listAllFolders(),
    listChildren(currentFolderId),
    getBreadcrumbs(currentFolderId),
  ]);

  const tree = buildFolderTree(flatFolders);

  const serialized = rows.map((r) => ({
    id: r.id,
    parentId: r.parentId,
    kind: r.kind,
    name: r.name,
    ufsUrl: r.ufsUrl,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="xs" className="text-muted-foreground -ml-2 mb-1 gap-1" asChild>
            <Link href="/admin">
              <ArrowLeft className="size-3.5" aria-hidden />
              Admin home
            </Link>
          </Button>
          <h1 className="font-heading text-h4 font-semibold text-foreground">File storage</h1>
        </div>
      </div>
      <DriveExplorer
        tree={tree}
        rows={serialized}
        breadcrumbs={breadcrumbs}
        currentFolderId={currentFolderId}
      />
    </div>
  );
}
