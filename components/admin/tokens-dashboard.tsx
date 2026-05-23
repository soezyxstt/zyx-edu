"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Trash2, KeyRound, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateEnrollmentToken, deleteEnrollmentToken } from "@/app/admin/tokens/actions";

type TokenRow = {
  id: string;
  token: string;
  courseId: string;
  courseTitle: string | null;
  createdAt: Date;
  usedAt: Date | null;
  usedByUserId: string | null;
  usedByUserName: string | null;
  usedByUserEmail: string | null;
  expiresAt: Date;
};

type CourseOption = {
  id: string;
  title: string;
};

type Props = {
  initialTokens: TokenRow[];
  coursesList: CourseOption[];
};

export function TokensDashboard({ initialTokens, coursesList }: Props) {
  const router = useRouter();
  const [selectedCourseId, setSelectedCourseId] = useState(coursesList[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.error("Silakan pilih course terlebih dahulu");
      return;
    }

    setLoading(true);
    try {
      const res = await generateEnrollmentToken(selectedCourseId);
      if (res.success) {
        toast.success(`Token berhasil dibuat: ${res.token}`);
        router.refresh();
      } else {
        toast.error(res.error || "Gagal membuat token");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tokenId: string, tokenStr: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus token "${tokenStr}"?`)) {
      return;
    }

    try {
      const res = await deleteEnrollmentToken(tokenId);
      if (res.success) {
        toast.success("Token berhasil dihapus");
        router.refresh();
      } else {
        toast.error(res.error || "Gagal menghapus token");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan koneksi");
    }
  };

  const handleCopy = (tokenStr: string, tokenId: string) => {
    navigator.clipboard.writeText(tokenStr);
    setCopiedTokenId(tokenId);
    toast.success("Token disalin ke papan klip!");
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Generate Form */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-heading text-body-lg font-bold text-foreground flex items-center gap-2 mb-4">
          <KeyRound className="size-5 text-brand-primary" />
          Buat Token Baru
        </h2>
        <form onSubmit={handleGenerate} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="course-select" className="text-body-xs font-semibold text-muted-foreground">
              Pilih Course / Kelas
            </label>
            <select
              id="course-select"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="h-11 w-full rounded-full border border-border bg-background px-4 text-body-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              {coursesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.id})
                </option>
              ))}
            </select>
          </div>
          <Button
            type="submit"
            disabled={loading || coursesList.length === 0}
            className="h-11 shrink-0 rounded-full px-6 bg-brand-primary text-white hover:bg-brand-primary/95 transition-all"
          >
            {loading ? "Membuat..." : "Generate Token"}
          </Button>
        </form>
      </div>

      {/* Tokens List */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-4">
          <h2 className="font-heading text-body-md font-bold text-foreground">
            Daftar Token ({initialTokens.length})
          </h2>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              router.refresh();
              toast.success("Daftar token diperbarui");
            }}
            className="rounded-full gap-1 text-muted-foreground"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        </div>

        {initialTokens.length === 0 ? (
          <div className="p-8 text-center text-body-sm text-muted-foreground">
            Belum ada token pendaftaran kelas yang dibuat.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-3xl text-left text-body-sm">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th scope="col" className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Token String
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mata Kuliah
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tanggal Kedaluwarsa
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Pengguna
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {initialTokens.map((t) => {
                  const now = new Date();
                  const isUsed = !!t.usedAt;
                  const isExpired = !isUsed && new Date(t.expiresAt) < now;

                  let statusBadge = (
                    <span className="inline-flex rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-body-xs font-semibold text-brand-primary">
                      Aktif
                    </span>
                  );

                  if (isUsed) {
                    statusBadge = (
                      <span className="inline-flex rounded-full bg-status-success/10 px-2.5 py-0.5 text-body-xs font-semibold text-status-success">
                        Digunakan
                      </span>
                    );
                  } else if (isExpired) {
                    statusBadge = (
                      <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-body-xs font-semibold text-muted-foreground ring-1 ring-border">
                        Kedaluwarsa
                      </span>
                    );
                  }

                  return (
                    <tr key={t.id} className="border-b border-border/60 last:border-0 hover:bg-muted/10">
                      <td className="px-6 py-4 font-mono font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{t.token}</span>
                          <button
                            onClick={() => handleCopy(t.token, t.id)}
                            className="text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                            title="Salin token"
                          >
                            {copiedTokenId === t.id ? (
                              <Check className="size-3.5 text-status-success" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        {t.courseTitle || t.courseId}
                      </td>
                      <td className="px-6 py-4 tabular-nums text-muted-foreground">
                        {new Date(t.expiresAt).toLocaleDateString("id-ID", {
                          dateStyle: "medium",
                        })}
                      </td>
                      <td className="px-6 py-4">{statusBadge}</td>
                      <td className="px-6 py-4">
                        {isUsed ? (
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{t.usedByUserName}</p>
                            <p className="text-body-xs text-muted-foreground truncate">{t.usedByUserEmail}</p>
                            <p className="text-body-xs text-muted-foreground mt-0.5 tabular-nums">
                              {new Date(t.usedAt!).toLocaleString("id-ID", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-body-xs italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(t.id, t.token)}
                          className="size-8 rounded-full text-status-error hover:bg-status-error/10 hover:text-status-error focus:outline-none"
                          title="Hapus token"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
