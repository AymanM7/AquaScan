import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Phase 0: pass-through. Phase 03+ will add Auth0 route protection and onboarding redirects.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and metadata routes.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
