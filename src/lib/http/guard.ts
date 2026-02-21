import { NextResponse } from "next/server";
import { requireApiUser, requireRestoreAdmin } from "@/lib/auth";
import {
  checkRateLimit,
  isSameOriginRequest,
  type RateLimitPolicy
} from "@/lib/request-security";
import { logSecurityEvent } from "@/lib/http/security-events";

export function withNoStoreHeaders(init?: HeadersInit) {
  const headers = new Headers(init);
  headers.set("Cache-Control", "no-store");
  headers.set("Pragma", "no-cache");
  return headers;
}

export function jsonNoStore(
  body: unknown,
  init?: Omit<ResponseInit, "headers"> & {
    headers?: HeadersInit;
  }
) {
  return NextResponse.json(body, {
    ...init,
    headers: withNoStoreHeaders(init?.headers)
  });
}

type GuardAuth = "none" | "api-user" | "restore-admin";

export async function guardApiRequest(
  request: Request,
  options?: {
    auth?: GuardAuth;
    sameOrigin?: boolean;
    allowNoneFetchSite?: boolean;
    rateLimitPolicy?: RateLimitPolicy;
  }
) {
  if (
    options?.sameOrigin &&
    !isSameOriginRequest(request, {
      allowNoneFetchSite: options.allowNoneFetchSite
    })
  ) {
    logSecurityEvent("origin_blocked", request, {
      fetchSite: request.headers.get("sec-fetch-site") ?? null,
      origin: request.headers.get("origin") ?? null,
      referer: request.headers.get("referer") ?? null
    });
    return {
      ok: false as const,
      response: jsonNoStore(
        { ok: false, message: "Forbidden origin" },
        { status: 403 }
      )
    };
  }

  if (options?.rateLimitPolicy) {
    const limitResult = checkRateLimit(request, options.rateLimitPolicy);
    if (!limitResult.ok) {
      logSecurityEvent("rate_limited", request, {
        scope: options.rateLimitPolicy.scope,
        retryAfterSec: limitResult.retryAfterSec
      });
      return {
        ok: false as const,
        response: jsonNoStore(
          { ok: false, message: "Too many requests. Please retry later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(limitResult.retryAfterSec)
            }
          }
        )
      };
    }
  }

  const auth = options?.auth ?? "api-user";
  try {
    if (auth === "api-user") {
      await requireApiUser();
    } else if (auth === "restore-admin") {
      await requireRestoreAdmin();
    }
  } catch {
    logSecurityEvent("auth_failed", request, {
      auth: auth
    });
    return {
      ok: false as const,
      response: jsonNoStore({ ok: false, message: "Unauthorized" }, { status: 401 })
    };
  }

  return { ok: true as const };
}
