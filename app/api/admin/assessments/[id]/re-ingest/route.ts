import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assessmentSources } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { inngest } from "@/lib/inngest";

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

  // Update status back to pending
  await db
    .update(assessmentSources)
    .set({
      ingestionStatus: "pending",
      ingestionError: null,
    })
    .where(eq(assessmentSources.id, id));

  // Trigger Inngest job
  await inngest.send({
    name: "assessment.ingest",
    data: { sourceId: id },
  });

  return NextResponse.json({
    success: true,
    message: "Re-ingestion triggered successfully in the background.",
  });
}
