"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { enrollWithToken } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";

export function EnrollmentForm({ className }: { className?: string }) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = token.trim();
    if (!cleanToken) {
      toast.error("Silakan masukkan token pendaftaran");
      return;
    }

    setLoading(true);
    try {
      const res = await enrollWithToken(cleanToken);
      if (res.success) {
        toast.success("Berhasil mendaftar ke kelas!");
        setToken("");
        router.refresh();
      } else {
        toast.error(res.error || "Pendaftaran gagal");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleEnroll} className={className}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center h-11 rounded-lg border border-border bg-background px-3.5 gap-2 focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary transition-shadow">
          <KeyRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            type="text"
            placeholder="Masukkan token kelas (misal: ZYX-CALC-ABCD)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={loading}
            className="flex-1 bg-transparent text-body-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="h-11 shrink-0 rounded-lg px-6 bg-brand-primary text-white hover:bg-brand-primary/95 transition-all"
        >
          {loading ? "Mendaftarkan..." : "Aktivasi Kelas"}
        </Button>
      </div>
    </form>
  );
}
