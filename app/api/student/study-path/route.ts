import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { enrollments } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { getOrComputeStudyPath } from "@/lib/study-path-service";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  if (env.FEATURE_STUDY_PATH !== "1") {
    return NextResponse.json({ error: "Study path feature disabled" }, { status: 403 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 });
  }

  // Verify active enrollment
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
    return NextResponse.json({ error: "Not enrolled or enrollment expired" }, { status: 403 });
  }

  try {
    const steps = await getOrComputeStudyPath(session.user.id, courseId);
    return NextResponse.json({ steps });
  } catch (err: any) {
    console.error("Error retrieving study path:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve study path" },
      { status: 500 }
    );
  }
}
