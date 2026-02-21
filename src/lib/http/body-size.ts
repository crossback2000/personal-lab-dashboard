const DEFAULT_SMALL_JSON_MAX_BYTES = 8 * 1024;

function parseContentLength(request: Request) {
  const raw = request.headers.get("content-length");
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.floor(parsed);
}

export function exceedsSmallJsonBodyLimit(
  request: Request,
  maxBytes = DEFAULT_SMALL_JSON_MAX_BYTES
) {
  const contentLength = parseContentLength(request);
  if (contentLength === null) {
    return false;
  }

  return contentLength > maxBytes;
}

export function smallJsonBodyLimitBytes() {
  return DEFAULT_SMALL_JSON_MAX_BYTES;
}
