import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { enrollments, studentConceptMasteryHistory } from "@/db/schema";
import { and, eq, gt, gte, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courseId = req.nextUrl.searchParams.get("courseId");
  const conceptName = req.nextUrl.searchParams.get("conceptName");

  if (!courseId || !conceptName) {
    return NextResponse.json({ error: "courseId and conceptName required" }, { status: 400 });
  }

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

    if (!enrollment) {
      return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
    }
  }

  // Calculate 28 days ago date boundary
  const twentyEightDaysAgo = new Date();
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
  const twentyEightDaysAgoStr = twentyEightDaysAgo.toISOString().split("T")[0];

  const points = await db
    .select({
      date: studentConceptMasteryHistory.snapshotDate,
      masteryScore: studentConceptMasteryHistory.masteryScore,
    })
    .from(studentConceptMasteryHistory)
    .where(
      and(
        eq(studentConceptMasteryHistory.studentId, session.user.id),
        eq(studentConceptMasteryHistory.courseId, courseId),
        eq(studentConceptMasteryHistory.conceptName, conceptName),
        gte(studentConceptMasteryHistory.snapshotDate, twentyEightDaysAgoStr)
      )
    )
    .orderBy(asc(studentConceptMasteryHistory.snapshotDate));

  return NextResponse.json({ points });
}
