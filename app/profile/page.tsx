import type { Metadata } from "next";
import { ShellPage } from "@/components/shell-page";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = {
  title: pageTitle("Profile"),
  description: "Profil pengguna, peran, badge, dan statistik di Zyx Edu.",
};

export default function ProfilePage() {
  return (
    <ShellPage
      title="Profile"
      description="Foto, nama, peran (admin / teacher / student), badge, aktivitas, dan statistik akan ditampilkan setelah backend profil siap."
    >
      <div className="rounded-2xl border border-border bg-card p-10 shadow-sm">
        <p className="text-body-md text-muted-foreground">
          Profile details are not wired yet — connect session user and profile API next.
        </p>
      </div>
    </ShellPage>
  );
}
