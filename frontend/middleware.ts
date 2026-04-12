import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ONBOARDING_COOKIE } from "./lib/onboarding-cookie";

const PROTECTED_PREFIXES = [
  "/map",
  "/building",
  "/compare",
  "/portfolio",
  "/dealroom",
  "/feed",
  "/automation",
  "/report",
  "/inbox",
];

/**
 * Phase 03+: gate mission surfaces until onboarding cookie is set.
 * For full Auth0 session claims + `withMiddlewareAuthRequired`, see `PHASE_03_LANDING_ONBOARDING.md`
 * (requires `@auth0/nextjs-auth0` and hosted login configuration).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) {
    return NextResponse.next();
  }
  const ok = request.cookies.get(ONBOARDING_COOKIE)?.value === "1";
  if (!ok) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
