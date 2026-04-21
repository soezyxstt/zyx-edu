"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getYoutubeEmbedUrl } from "@/lib/youtube";
import type { CourseMaterial } from "@/lib/student-course-fixtures";

type MaterialViewerProps = {
  material: CourseMaterial;
};

export function MaterialViewer({ material }: MaterialViewerProps) {
  const [done, setDone] = useState(material.completed);

  function markDone() {
    setDone(true);
    toast.success("Ditandai selesai (preview — belum tersimpan ke server).");
    // TODO: persist progress + bump user.lastActivityAt for streaks
  }

  const openUrl = material.url ?? "#";

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {material.kind === "article" && material.body ? (
          <div>
            {material.body.split(/\n\n+/).map((para, i) => (
              <p
                key={i}
                className="mb-4 text-body-base leading-relaxed text-foreground last:mb-0"
              >
                {para}
              </p>
            ))}
          </div>
        ) : null}

        {material.kind === "pdf" && material.url ? (
          <div className="space-y-4">
            <p className="text-body-sm text-muted-foreground">
              Pratinjau PDF di bawah. Jika peramban tidak mendukung, gunakan unduh.
            </p>
            <div className="photo-card w-full overflow-hidden border border-border bg-muted/30 md:aspect-video">
              <iframe
                title={material.title}
                src={material.url}
                className="size-full"
              />
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <a href={material.url} download target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 size-4" aria-hidden />
                Unduh / buka file
              </a>
            </Button>
          </div>
        ) : null}

        {material.kind === "image" && material.url ? (
          <div className="relative mx-auto max-w-3xl">
            <div className="photo-inline relative aspect-video w-full overflow-hidden">
              <Image
                src={material.url}
                alt={material.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 48rem"
              />
            </div>
          </div>
        ) : null}

        {material.kind === "video" && material.url ? (
          <div className="space-y-4">
            {(() => {
              const embed = getYoutubeEmbedUrl(material.url);
              if (embed) {
                return (
                  <div className="aspect-video w-full overflow-hidden rounded-xl border border-border">
                    <iframe
                      title={material.title}
                      src={embed}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="size-full"
                    />
                  </div>
                );
              }
              return (
                <p className="text-body-base text-muted-foreground">
                  Video tidak didukung untuk sematan langsung. Buka di tab baru.
                </p>
              );
            })()}
            <Button asChild variant="outline" className="rounded-full">
              <a href={material.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 size-4" aria-hidden />
                Buka sumber video
              </a>
            </Button>
          </div>
        ) : null}

        {material.kind === "link" && material.url ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-base text-muted-foreground">
              Materi ini mengarah ke sumber eksternal.
            </p>
            <Button asChild className="rounded-full">
              <a href={material.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 size-4" aria-hidden />
                Buka tautan
              </a>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={markDone}
          disabled={done}
          className="rounded-full"
        >
          {done ? "Selesai" : "Tandai selesai"}
        </Button>
        {material.url && material.kind !== "article" ? (
          <Button asChild variant="ghost" className="rounded-full">
            <a href={openUrl} target="_blank" rel="noopener noreferrer">
              Buka sumber asli
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
