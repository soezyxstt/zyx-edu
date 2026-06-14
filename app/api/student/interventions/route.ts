import { NextResponse } from "next/server";
import { db } from "@/db";
import { interventions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(interventions)
    .where(
      and(
        eq(interventions.studentId, session.user.id),
        eq(interventions.status, "active")
      )
    )
    .orderBy(desc(interventions.createdAt));

  return NextResponse.json(rows);
}
