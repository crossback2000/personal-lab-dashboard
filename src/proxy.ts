import { NextResponse, type NextRequest } from "next/server";
import {
  getSecurityConfigError,
  isCloudflareModeEnabled
} from "@/lib/env";

const BYPASS_PATHS = ["/unauthorized", "/_next", "/favicon.ico"];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function proxy(request: NextRequest) {
  const securityConfigError = getSecurityConfigError();
  if (securityConfigError) {
    return new NextResponse(securityConfigError, { status: 503 });
  }

  if (!isCloudflareModeEnabled()) {
    return NextResponse.next();
  }

  if (BYPASS_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const jwt = request.headers.get("cf-access-jwt-assertion")?.trim();
  const email = request.headers.get("cf-access-authenticated-user-email")?.trim();
  const allowedEmail = process.env.ACCESS_SINGLE_USER_EMAIL?.trim();

  if (!jwt) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if (allowedEmail && email && normalize(email) !== normalize(allowedEmail)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
