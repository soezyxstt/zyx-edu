import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { interventions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

type Context = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Context) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await db
    .update(interventions)
    .set({ status: "dismissed" })
    .where(
      and(
        eq(interventions.id, id),
        eq(interventions.studentId, session.user.id)
      )
    );

  return NextResponse.json({ success: true });
}
