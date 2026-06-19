import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assessmentSources } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [source] = await db
    .select()
    .from(assessmentSources)
    .where(eq(assessmentSources.id, id));

  if (!source) {
    return NextResponse.json({ error: "Assessment source not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action || "archive";

  if (action === "archive") {
    await db
      .update(assessmentSources)
      .set({
        deletedAt: new Date(),
        deletedByUserId: session.user.id,
      })
      .where(eq(assessmentSources.id, id));

    return NextResponse.json({
      success: true,
      message: "Assessment source archived successfully.",
    });
  } else if (action === "restore") {
    await db
      .update(assessmentSources)
      .set({
        deletedAt: null,
        deletedByUserId: null,
      })
      .where(eq(assessmentSources.id, id));

    return NextResponse.json({
      success: true,
      message: "Assessment source restored successfully.",
    });
  } else {
    return NextResponse.json({ error: "Invalid action. Use 'archive' or 'restore'." }, { status: 400 });
  }
}
