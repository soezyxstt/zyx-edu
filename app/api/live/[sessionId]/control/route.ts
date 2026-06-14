/**
 * POST /api/live/[sessionId]/control
 * Host-only proxy to the Durable Object control endpoint.
 * Verifies the caller is the session's tutor, then forwards the action.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { liveQuizSessions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

type Context = { params: Promise<{ sessionId: string }> };

const ControlSchema = z.object({
  action: z.enum(["start", "next", "reveal", "end"]),
});

export async function POST(req: NextRequest, { params }: Context) {
  if (env.FEATURE_LIVE !== "1") return NextResponse.json({ error: "Disabled" }, { status: 404 });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;

  // Verify caller is the session's tutor (or admin)
  const where =
    session.user.role === "admin"
      ? eq(liveQuizSessions.id, sessionId)
      : and(eq(liveQuizSessions.id, sessionId), eq(liveQuizSessions.tutorId, session.user.id));

  const [liveSession] = await db
    .select({ id: liveQuizSessions.id, state: liveQuizSessions.state })
    .from(liveQuizSessions)
    .where(where)
    .limit(1);

  if (!liveSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (liveSession.state === "ended") {
    return NextResponse.json({ error: "Session has ended" }, { status: 410 });
  }

  const body = ControlSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const realtimeUrl = env.NEXT_PUBLIC_REALTIME_URL;
  if (!realtimeUrl) {
    return NextResponse.json({ error: "Realtime worker not configured" }, { status: 503 });
  }
  const secret = env.LIVE_HMAC_SECRET ?? "";

  const workerRes = await fetch(`${realtimeUrl}/room/${sessionId}/control`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ action: body.data.action }),
  });

  if (!workerRes.ok) {
    const err = await workerRes.text();
    return NextResponse.json({ error: err }, { status: workerRes.status });
  }

  // Sync state into Turso when session ends via this route
  if (body.data.action === "end") {
    await db
      .update(liveQuizSessions)
      .set({ state: "ended", endedAt: new Date() })
      .where(eq(liveQuizSessions.id, sessionId));
  }

  return NextResponse.json({ ok: true });
}
