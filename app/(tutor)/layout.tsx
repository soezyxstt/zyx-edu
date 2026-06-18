import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import type { ReactNode } from "react";
import { TutorSidebar } from "@/components/tutor/tutor-sidebar";

export default async function TutorLayout({ children }: { children: ReactNode }) {
  if (env.FEATURE_TUTOR_ANALYTICS !== "1") redirect("/");

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const role = (session.user as { role?: string | null }).role;
  if (role !== "teacher" && role !== "admin") redirect("/");

  return (
    <div className="relative flex min-h-screen flex-row bg-landing-hero-shell overflow-x-clip">
      <TutorSidebar />
      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 min-w-0 flex-1 focus:outline-none"
      >
        {children}
      </main>
    </div>
  );
}
