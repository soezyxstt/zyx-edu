import type { Metadata } from "next";
import { ShellPage } from "@/components/shell-page";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = {
  title: pageTitle("Settings"),
  description: "Pengaturan tampilan dan preferensi akun Zyx Edu.",
};

export default function SettingsPage() {
  return (
    <ShellPage
      title="Settings"
      description="Ukuran font, gaya font, skema warna, dan preferensi lain akan dikonfigurasi di sini."
    >
      <div className="rounded-2xl border border-border bg-card p-10 shadow-sm">
        <p className="text-body-md text-muted-foreground">
          Settings UI coming soon — theme and typography controls will map to your design tokens.
        </p>
      </div>
    </ShellPage>
  );
}
