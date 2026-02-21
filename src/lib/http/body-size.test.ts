import { describe, expect, it } from "vitest";
import {
  exceedsSmallJsonBodyLimit,
  smallJsonBodyLimitBytes
} from "@/lib/http/body-size";

describe("exceedsSmallJsonBodyLimit", () => {
  it("returns false when content-length header is missing", () => {
    const request = new Request("https://example.com/api/backup/delete", {
      method: "POST"
    });
    expect(exceedsSmallJsonBodyLimit(request)).toBe(false);
  });

  it("returns true when content-length exceeds default limit", () => {
    const limit = smallJsonBodyLimitBytes();
    const request = new Request("https://example.com/api/backup/delete", {
      method: "POST",
      headers: {
        "content-length": String(limit + 1)
      }
    });
    expect(exceedsSmallJsonBodyLimit(request)).toBe(true);
  });

  it("returns false when content-length is within default limit", () => {
    const limit = smallJsonBodyLimitBytes();
    const request = new Request("https://example.com/api/backup/delete", {
      method: "POST",
      headers: {
        "content-length": String(limit)
      }
    });
    expect(exceedsSmallJsonBodyLimit(request)).toBe(false);
  });
});
