import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export type LocalUser = {
  id: string;
  email: string;
};

function normalized(value: string) {
  return value.trim().toLowerCase();
}

function cloudflareModeEnabled() {
  return normalized(process.env.ACCESS_MODE || "none") === "cloudflare";
}

type CloudflareJwtHeader = {
  alg?: unknown;
  kid?: unknown;
  typ?: unknown;
};

type CloudflareJwtPayload = {
  aud?: unknown;
  email?: unknown;
  exp?: unknown;
  iat?: unknown;
  iss?: unknown;
  nbf?: unknown;
  sub?: unknown;
};

type CloudflareJwk = crypto.JsonWebKey & {
  kid?: string;
  kty?: string;
  use?: string;
  alg?: string;
};

type JwkCacheEntry = {
  fetchedAt: number;
  keys: CloudflareJwk[];
};

const JWK_CACHE_TTL_MS = 5 * 60 * 1000;
const jwkCache = new Map<string, JwkCacheEntry>();

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function toBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }
  const normalizedValue = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalizedValue)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalizedValue)) {
    return false;
  }
  return fallback;
}

function requireCloudflareInProduction() {
  return toBoolean(process.env.REQUIRE_CLOUDFLARE_IN_PRODUCTION, true);
}

function parseCloudflareTeamDomain(raw: string | undefined) {
  if (!raw) {
    return "";
  }
  const value = raw.trim();
  if (!value) {
    return "";
  }
  return value.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

function getCloudflareAccessConfig() {
  const teamDomain = parseCloudflareTeamDomain(process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN);
  const audience = process.env.CLOUDFLARE_ACCESS_AUD?.trim() || "";
  const issuer = process.env.CLOUDFLARE_ACCESS_ISSUER?.trim()
    ? stripTrailingSlash(process.env.CLOUDFLARE_ACCESS_ISSUER!.trim())
    : teamDomain
      ? `https://${stripTrailingSlash(teamDomain)}`
      : "";

  return {
    teamDomain,
    audience,
    issuer
  };
}

function decodeJwtSegment(segment: string) {
  const decoded = Buffer.from(segment, "base64url").toString("utf8");
  return JSON.parse(decoded) as Record<string, unknown>;
}

function audMatches(audClaim: unknown, expectedAudience: string) {
  if (typeof audClaim === "string") {
    return audClaim === expectedAudience;
  }
  if (Array.isArray(audClaim)) {
    return audClaim.some((entry) => typeof entry === "string" && entry === expectedAudience);
  }
  return false;
}

function parseNumericClaim(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function fetchCloudflareJwks(teamDomain: string) {
  const now = Date.now();
  const cached = jwkCache.get(teamDomain);

  if (cached && now - cached.fetchedAt < JWK_CACHE_TTL_MS) {
    return cached.keys;
  }

  const certsUrl = `https://${teamDomain}/cdn-cgi/access/certs`;
  const response = await fetch(certsUrl, {
    cache: "no-store"
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as
    | {
        keys?: CloudflareJwk[];
      }
    | CloudflareJwk[];

  const keys = Array.isArray(payload) ? payload : Array.isArray(payload.keys) ? payload.keys : [];
  const validKeys = keys.filter((key) => key && typeof key === "object");

  jwkCache.set(teamDomain, {
    fetchedAt: now,
    keys: validKeys
  });

  return validKeys;
}

async function verifyCloudflareAccessJwt(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  let header: CloudflareJwtHeader;
  let payload: CloudflareJwtPayload;

  try {
    header = decodeJwtSegment(encodedHeader) as CloudflareJwtHeader;
    payload = decodeJwtSegment(encodedPayload) as CloudflareJwtPayload;
  } catch {
    return null;
  }

  if (header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid) {
    return null;
  }

  const accessConfig = getCloudflareAccessConfig();
  if (!accessConfig.teamDomain || !accessConfig.audience || !accessConfig.issuer) {
    return null;
  }

  const keys = await fetchCloudflareJwks(accessConfig.teamDomain);
  const matchedKey = keys.find((key) => key.kid === header.kid);
  if (!matchedKey || matchedKey.kty !== "RSA") {
    return null;
  }

  const signingInput = Buffer.from(`${encodedHeader}.${encodedPayload}`);
  const signature = Buffer.from(encodedSignature, "base64url");

  let verified = false;
  try {
    const jwkKey = matchedKey as crypto.JsonWebKey;
    const keyObject = crypto.createPublicKey({
      key: jwkKey,
      format: "jwk"
    });
    verified = crypto.verify("RSA-SHA256", signingInput, keyObject, signature);
  } catch {
    verified = false;
  }

  if (!verified) {
    return null;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const exp = parseNumericClaim(payload.exp);
  const nbf = parseNumericClaim(payload.nbf);
  const iat = parseNumericClaim(payload.iat);

  if (exp === null || exp <= nowSec - 60) {
    return null;
  }

  if (nbf !== null && nbf > nowSec + 60) {
    return null;
  }

  if (iat !== null && iat > nowSec + 5 * 60) {
    return null;
  }

  if (typeof payload.iss !== "string") {
    return null;
  }

  if (stripTrailingSlash(payload.iss) !== accessConfig.issuer) {
    return null;
  }

  if (!audMatches(payload.aud, accessConfig.audience)) {
    return null;
  }

  return payload;
}

export async function getCurrentUser(): Promise<LocalUser | null> {
  if (process.env.NODE_ENV === "production" && requireCloudflareInProduction() && !cloudflareModeEnabled()) {
    return null;
  }

  if (!cloudflareModeEnabled()) {
    const localEmail = process.env.ACCESS_SINGLE_USER_EMAIL?.trim() || "local-single-user@localhost";
    return {
      id: "local-single-user",
      email: localEmail
    };
  }

  const requestHeaders = await headers();
  const requestCookies = await cookies();
  const jwt =
    requestHeaders.get("cf-access-jwt-assertion")?.trim() ||
    requestCookies.get("CF_Authorization")?.value?.trim();
  if (!jwt) {
    return null;
  }

  const verifiedPayload = await verifyCloudflareAccessJwt(jwt);
  if (!verifiedPayload) {
    return null;
  }

  const headerEmail = requestHeaders.get("cf-access-authenticated-user-email")?.trim();
  const tokenEmail = typeof verifiedPayload.email === "string" ? verifiedPayload.email.trim() : "";
  const email = headerEmail || tokenEmail;

  if (!email) {
    return null;
  }

  if (headerEmail && tokenEmail && normalized(headerEmail) !== normalized(tokenEmail)) {
    return null;
  }

  const allowed = process.env.ACCESS_SINGLE_USER_EMAIL?.trim();
  if (allowed && normalized(email) !== normalized(allowed)) {
    return null;
  }

  const userId =
    typeof verifiedPayload.sub === "string" && verifiedPayload.sub.trim()
      ? normalized(verifiedPayload.sub)
      : normalized(email);

  return {
    id: userId,
    email
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/unauthorized");
  }
  return user;
}

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireRestoreAdmin() {
  return requireApiUser();
}
