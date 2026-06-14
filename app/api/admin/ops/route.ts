import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getOpsMetrics } from "@/lib/ops-metrics";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const metrics = await getOpsMetrics();
    return NextResponse.json(metrics);
  } catch (err) {
    console.error("ops metrics failed:", err);
    return NextResponse.json({ error: "Failed to load metrics" }, { status: 500 });
  }
}
