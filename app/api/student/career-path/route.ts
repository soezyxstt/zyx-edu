/**
 * GET /api/student/career-path ; list career templates, or compute one career's
 * prerequisite-ordered concept path (with the caller's own mastery if logged in)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { listCareerPathTemplates, computeCareerPath } from "@/lib/career-path-service";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templateId = req.nextUrl.searchParams.get("templateId");

  if (!templateId) {
    const templates = await listCareerPathTemplates();
    return NextResponse.json({ templates });
  }

  try {
    const steps = await computeCareerPath(templateId, session.user.id);
    return NextResponse.json({ steps });
  } catch (err: any) {
    console.error("Error computing career path:", err);
    return NextResponse.json({ error: err.message || "Failed to compute career path" }, { status: 500 });
  }
}
