import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware — pass-through only.
 *
 * Locale detection is handled entirely by the client (locale-context.tsx):
 *   1. NEXT_LOCALE cookie (user's saved language preference)
 *   2. navigator.language fallback
 *
 * We actively prevent any locale-based URL redirect caching that may have
 * been left over from a previous version of this middleware.
 */
export function middleware(request: NextRequest) {
  const res = NextResponse.next();
  // Prevent browsers from caching any response as a redirect.
  // This clears stale redirect entries (e.g. old /zh or /en prefixed paths).
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  return res;
}

export const config = {
  // Only run on HTML page routes, not on _next assets or API routes
  matcher: ["/((?!_next/static|_next/image|api|favicon.ico|icons|images|.*\\..*).*)"],
};
