import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { enrollments } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { getMastery } from "@/lib/mastery-store";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

  // Verify active enrollment
  if (session.user.role !== "admin") {
    const [enrollment] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, session.user.id),
          eq(enrollments.courseId, courseId),
          gt(enrollments.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!enrollment) return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
  }

  const concepts = await getMastery(session.user.id, courseId);
  return NextResponse.json({ concepts });
}
