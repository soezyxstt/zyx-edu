import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Paths that require a user session (protected paths)
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/courses") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/admin");

  // Authentication paths
  const isAuthRoute = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

  // API paths and static assets are excluded from middleware matching in config below,
  // but we return early just in case.
  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  // Retrieve user session from better-auth endpoint.
  // Using a fetch call here is Edge-runtime safe and prevents direct database import crashes.
  let session: any = null;
  try {
    const sessionRes = await fetch(new URL("/api/auth/get-session", request.url), {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });
    if (sessionRes.ok) {
      session = await sessionRes.json();
    }
  } catch (err) {
    console.error("Proxy session fetch failed:", err);
  }

  const user = session?.user;

  // 1. Unauthenticated users trying to access protected paths -> redirect to /sign-in
  if (isProtectedRoute && !user) {
    const signInUrl = new URL("/sign-in", request.url);
    // Preserving target route for redirects after login
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // 2. Authenticated users trying to access auth paths (/sign-in, /sign-up)
  if (isAuthRoute && user) {
    if (user.role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 3. Authenticated student/teacher trying to access /admin -> redirect to /dashboard
  if (pathname.startsWith("/admin") && user?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 4. Authenticated admin trying to access student dashboard/pages -> allowed
  // Admins can access student dashboard and other student-specific routes without redirect.

  return NextResponse.next();
}

export const config = {
  // Protect routes but skip Next.js internals, static assets, and api endpoints (except auth check)
  matcher: [
    "/dashboard/:path*",
    "/courses/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/sign-in",
    "/sign-up",
  ],
};
