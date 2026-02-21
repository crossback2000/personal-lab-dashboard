import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "@/lib/request-security";

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
});
