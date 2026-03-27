import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware — path normalisation only.
 *
 * Locale detection is handled entirely by the client (locale-context.tsx):
 *   1. NEXT_LOCALE cookie set by the language switcher
 *   2. navigator.language fallback
 *
 * We do NOT do any locale-based URL prefixing here.
 * Locale prefixed paths like /zh/... or /en/... are no longer generated,
 * which fixes the "zh.txt" download bug on Chinese mobile devices.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|icons|images|.*\\..*).*)"],
};
