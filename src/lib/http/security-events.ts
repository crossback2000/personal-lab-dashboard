type SecurityEventType = "origin_blocked" | "rate_limited" | "auth_failed";

function pickRequestPath(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export function logSecurityEvent(
  type: SecurityEventType,
  request: Request,
  details?: Record<string, unknown>
) {
  const payload = {
    event: "api_guard_block",
    type,
    path: pickRequestPath(request.url),
    method: request.method,
    at: new Date().toISOString(),
    ...details
  };

  console.warn("[security]", JSON.stringify(payload));
}
