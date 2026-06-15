import { auth } from "@/lib/auth"; // Adjust the import path if needed
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

const handler = toNextJsHandler(auth);

export async function GET(request: NextRequest) {
  console.log("[Auth GET] Request URL:", request.url);
  console.log("[Auth GET] Request Headers:", Object.fromEntries(request.headers.entries()));
  try {
    const res = await handler.GET(request);
    console.log("[Auth GET] Response Status:", res.status);
    return res;
  } catch (err) {
    console.error("[Auth GET] Handler threw error:", err);
    throw err;
  }
}

export async function POST(request: NextRequest) {
  console.log("[Auth POST] Request URL:", request.url);
  console.log("[Auth POST] Request Headers:", Object.fromEntries(request.headers.entries()));
  try {
    const res = await handler.POST(request);
    console.log("[Auth POST] Response Status:", res.status);
    return res;
  } catch (err) {
    console.error("[Auth POST] Handler threw error:", err);
    throw err;
  }
}
