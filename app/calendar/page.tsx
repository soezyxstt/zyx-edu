import type { Metadata } from "next";
import { ShellPage } from "@/components/shell-page";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = {
  title: pageTitle("Calendar"),
  description: "Kalender jadwal dan acara internal Zyx Edu.",
};

export default function CalendarPage() {
  return (
    <ShellPage
      title="Calendar"
      description="Jadwal tryout, pertemuan, dan acara internal akan ditampilkan di sini setelah integrasi kalender aktif."
    >
      <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
        <p className="text-body-md text-muted-foreground">
          No events yet — this area will list schedules and Zyx internal events.
        </p>
      </div>
    </ShellPage>
  );
}
