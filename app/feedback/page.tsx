import type { Metadata } from "next";
import { ShellPage } from "@/components/shell-page";
import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = {
  title: pageTitle("Feedback"),
  description: "Kirim masukan untuk kualitas layanan atau performa pengajar.",
};

export default function FeedbackPage() {
  return (
    <ShellPage
      title="Feedback"
      description="Kami membaca setiap masukan. Form terhubung ke layanan email pada fase berikutnya — gunakan tombol di bawah sebagai placeholder."
    >
      <div className="max-w-xl rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="text-body-md text-muted-foreground">
          Form feedback (kualitas layanan &amp; pengajar) akan tersedia di sini. Untuk saat ini, hubungi
          tim Zyx melalui kanal resmi di footer.
        </p>
        <Button type="button" className="mt-6 rounded-full" disabled>
          Open form (soon)
        </Button>
      </div>
    </ShellPage>
  );
}
