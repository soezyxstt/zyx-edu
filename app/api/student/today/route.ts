import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { getStudentEnrollments } from "@/app/dashboard/actions";
import { getOrUpdateStreak } from "@/lib/streak-service";
import { getOrBuildTodayRecommendation } from "@/lib/recommendation-service";

export async function GET() {
  if (env.FEATURE_TODAY !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = session.user.id;

  const [streak, enrollments] = await Promise.all([
    getOrUpdateStreak(studentId),
    getStudentEnrollments(),
  ]);

  const enrolledCourseIds = enrollments.map((e) => e.id);
  const recommendation = await getOrBuildTodayRecommendation(studentId, enrolledCourseIds);

  return NextResponse.json({
    streak: { current: streak.current, longest: streak.longest },
    items: recommendation.items,
  });
}
