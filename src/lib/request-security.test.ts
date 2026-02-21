import { describe, expect, it } from "vitest";
import { getClientIp, isSameOriginRequest } from "@/lib/request-security";

describe("isSameOriginRequest", () => {
  it("accepts same-origin requests via Origin header", () => {
    const request = new Request("https://example.com/api/backup/create", {
      method: "POST",
      headers: {
        host: "example.com",
        origin: "https://example.com",
        "sec-fetch-site": "same-origin"
      }
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("accepts same-origin requests via Referer when Origin is missing", () => {
    const request = new Request("https://example.com/api/backup/create", {
      method: "POST",
      headers: {
        host: "example.com",
        referer: "https://example.com/dashboard/backups",
        "sec-fetch-site": "same-origin"
      }
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects cross-origin requests", () => {
    const request = new Request("https://example.com/api/backup/create", {
      method: "POST",
      headers: {
        host: "example.com",
        origin: "https://evil.example",
        "sec-fetch-site": "cross-site"
      }
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("rejects same-site requests to keep strict same-origin policy", () => {
    const request = new Request("https://example.com/api/backup/create", {
      method: "POST",
      headers: {
        host: "example.com",
        origin: "https://example.com",
        "sec-fetch-site": "same-site"
      }
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("blocks sec-fetch-site=none by default, unless explicitly allowed", () => {
    const request = new Request("https://example.com/api/backup/create", {
      method: "POST",
      headers: {
        host: "example.com",
        origin: "https://example.com",
        "sec-fetch-site": "none"
      }
    });

    expect(isSameOriginRequest(request)).toBe(false);
    expect(isSameOriginRequest(request, { allowNoneFetchSite: true })).toBe(true);
  });
});

describe("getClientIp", () => {
  it("uses cf-connecting-ip in cloudflare mode", () => {
    const request = new Request("https://example.com/api/backup/create", {
      headers: {
        "cf-connecting-ip": "203.0.113.10",
        "x-forwarded-for": "198.51.100.42"
      }
    });

    expect(getClientIp(request, { cloudflareMode: true, trustProxy: true })).toBe("203.0.113.10");
  });

  it("does not trust forwarded headers when trustProxy is false", () => {
    const request = new Request("https://example.com/api/backup/create", {
      headers: {
        "x-forwarded-for": "198.51.100.42",
        "x-real-ip": "198.51.100.99"
      }
    });

    expect(getClientIp(request, { cloudflareMode: false, trustProxy: false })).toBe("unknown");
  });

  it("uses x-forwarded-for when trustProxy is enabled", () => {
    const request = new Request("https://example.com/api/backup/create", {
      headers: {
        "x-forwarded-for": "198.51.100.42, 10.0.0.1"
      }
    });

    expect(getClientIp(request, { cloudflareMode: false, trustProxy: true })).toBe("198.51.100.42");
  });
});
