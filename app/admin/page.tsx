import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/site";
import { FolderOpen } from "lucide-react";

export const metadata: Metadata = {
  title: pageTitle("Admin"),
  description: "Panel admin Zyx Edu.",
};

export default function AdminHomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-heading text-h4 font-semibold text-foreground">Admin</h1>
      <p className="mt-2 text-body-md text-muted-foreground">
        Manage site content — open the storage console below.
      </p>
      <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-heading text-h6 font-semibold text-foreground">Storage</h2>
        <p className="text-body-sm text-muted-foreground mt-2 max-w-prose leading-relaxed">
          Upload, organise, rename, and delete files in a Google Drive–style folder tree (powered by UploadThing).
        </p>
        <Button className="mt-4 gap-2" asChild>
          <Link href="/admin/files">
            <FolderOpen className="size-4" aria-hidden />
            Open file manager
          </Link>
        </Button>
      </div>
    </div>
  );
}
