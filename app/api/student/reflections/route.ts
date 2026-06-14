import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { weeklyReflections } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const latest = searchParams.get("latest") === "true";

  if (latest) {
    const [latestReflection] = await db
      .select()
      .from(weeklyReflections)
      .where(eq(weeklyReflections.studentId, session.user.id))
      .orderBy(desc(weeklyReflections.weekStart))
      .limit(1);

    return NextResponse.json(latestReflection ?? null);
  }

  const reflections = await db
    .select()
    .from(weeklyReflections)
    .where(eq(weeklyReflections.studentId, session.user.id))
    .orderBy(desc(weeklyReflections.weekStart));

  return NextResponse.json(reflections);
}
