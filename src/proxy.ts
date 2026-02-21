import { NextResponse, type NextRequest } from "next/server";

const BYPASS_PATHS = ["/unauthorized", "/_next", "/favicon.ico"];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function isCloudflareMode() {
  return normalize(process.env.ACCESS_MODE || "none") === "cloudflare";
}

function requireCloudflareInProduction() {
  const raw = process.env.REQUIRE_CLOUDFLARE_IN_PRODUCTION;
  if (!raw) {
    return true;
  }
  const normalizedValue = normalize(raw);
  if (["0", "false", "no", "n", "off"].includes(normalizedValue)) {
    return false;
  }
  if (["1", "true", "yes", "y", "on"].includes(normalizedValue)) {
    return true;
  }
  return true;
}

function cloudflareAccessConfigReady() {
  const teamDomain = process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN?.trim();
  const audience = process.env.CLOUDFLARE_ACCESS_AUD?.trim();
  return !!teamDomain && !!audience;
}

export function proxy(request: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    requireCloudflareInProduction() &&
    !isCloudflareMode()
  ) {
    return new NextResponse("Security configuration error: ACCESS_MODE must be cloudflare in production.", {
      status: 503
    });
  }

  if (isCloudflareMode() && !cloudflareAccessConfigReady()) {
    return new NextResponse(
      "Security configuration error: CLOUDFLARE_ACCESS_TEAM_DOMAIN and CLOUDFLARE_ACCESS_AUD are required.",
      { status: 503 }
    );
  }

  if (!isCloudflareMode()) {
    return NextResponse.next();
  }

  if (BYPASS_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const jwt =
    request.headers.get("cf-access-jwt-assertion")?.trim() ||
    request.cookies.get("CF_Authorization")?.value?.trim();
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
