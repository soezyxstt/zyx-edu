import { headers } from "next/headers";

import { auth } from "@/lib/auth";

type UserWithRole = { id: string; role?: string | null };

export async function assertAdmin() {
  const h = await headers();
  const session = await auth.api.getSession({
    headers: h,
  });
  const user = session?.user as UserWithRole | undefined;

  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  if (user.role !== "admin") {
    throw new Error("Forbidden — admin role required.");
  }

  return { session, user };
}
