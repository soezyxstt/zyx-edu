import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { env } from "@/lib/env";

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  if (env.FEATURE_TUTOR_ANALYTICS !== "1") redirect("/");

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const role = (session.user as { role?: string | null }).role;
  if (role !== "teacher" && role !== "admin") redirect("/");

  return <>{children}</>;
}
