import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { markRecommendationDone } from "@/lib/recommendation-service";

const Schema = z.object({ itemId: z.string().min(1) });

export async function POST(req: NextRequest) {
  if (env.FEATURE_TODAY !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await markRecommendationDone(parsed.data.itemId, session.user.id);
  return NextResponse.json({ ok: true });
}
