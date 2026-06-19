import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { updateMaterialProgress } from "@/lib/material-progress.repository";

const PostBodySchema = z.object({
  materialId: z.string().min(1),
  completionPercent: z.number().min(0).max(100),
  lastSectionId: z.string().nullable().optional(),
  lastPosition: z.object({
    type: z.enum(["pdf", "article"]),
    page: z.number().optional(),
    section: z.string().optional(),
  }).nullable().optional(),
  timeSpentSeconds: z.number().int().nonnegative(),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = PostBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const studentId = session.user.id;
    const { materialId, completionPercent, lastSectionId, lastPosition, timeSpentSeconds } = parsed.data;

    const result = await updateMaterialProgress({
      studentId,
      materialId,
      completionPercent,
      lastSectionId: lastSectionId || null,
      lastPosition: lastPosition || null,
      timeSpentSeconds,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/student/material-progress error:", error);
    return NextResponse.json({ error: error.message || "Failed to update material progress" }, { status: 500 });
  }
}
