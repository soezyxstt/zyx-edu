import { auth } from "@/lib/auth"; // Adjust the import path if needed
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

const handler = toNextJsHandler(auth);

export async function GET(request: NextRequest) {
  try {
    return await handler.GET(request);
  } catch (err) {
    console.error("[Auth GET] Handler threw error:", err);
    throw err;
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handler.POST(request);
  } catch (err) {
    console.error("[Auth POST] Handler threw error:", err);
    throw err;
  }
}
