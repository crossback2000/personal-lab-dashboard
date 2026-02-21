import { describe, expect, it } from "vitest";
import { guardApiRequest, jsonNoStore, withNoStoreHeaders } from "@/lib/http/guard";

describe("withNoStoreHeaders", () => {
  it("adds no-store cache headers", () => {
    const headers = withNoStoreHeaders({ "X-Test": "1" });
    expect(headers.get("X-Test")).toBe("1");
    expect(headers.get("Cache-Control")).toBe("no-store");
    expect(headers.get("Pragma")).toBe("no-cache");
  });
});

describe("jsonNoStore", () => {
  it("returns json response with no-store headers", () => {
    const response = jsonNoStore({ ok: true }, { status: 201 });
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
  });
});

describe("guardApiRequest", () => {
  it("rejects cross-origin request when sameOrigin is required", async () => {
    const request = new Request("https://example.com/api/backup/create", {
      method: "POST",
      headers: {
        host: "example.com",
        origin: "https://evil.example"
      }
    });

    const result = await guardApiRequest(request, {
      auth: "none",
      sameOrigin: true
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("applies rate limit policy", async () => {
    const scope = `guard-test-${Date.now()}-${Math.random()}`;
    const request = new Request("https://example.com/api/backup/list", {
      method: "GET",
      headers: {
        host: "example.com"
      }
    });

    const first = await guardApiRequest(request, {
      auth: "none",
      rateLimitPolicy: {
        scope,
        limit: 1,
        windowMs: 60_000
      }
    });
    const second = await guardApiRequest(request, {
      auth: "none",
      rateLimitPolicy: {
        scope,
        limit: 1,
        windowMs: 60_000
      }
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.response.status).toBe(429);
      expect(second.response.headers.get("Retry-After")).toBeTruthy();
    }
  });
});
