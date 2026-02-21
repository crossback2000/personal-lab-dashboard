type RateLimitPolicy = {
  scope: string;
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 10000;

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function normalizeIp(raw: string | null) {
  if (!raw) {
    return "unknown";
  }
  return raw.trim();
}

function normalizeHost(raw: string | null) {
  if (!raw) {
    return "";
  }
  return raw.trim().toLowerCase();
}

function normalizeForwardedProto(raw: string | null) {
  if (!raw) {
    return "";
  }
  const first = raw.split(",")[0]?.trim().toLowerCase() ?? "";
  return first;
}

export function getClientIp(request: Request) {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) {
    return normalizeIp(cfIp);
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0];
    return normalizeIp(first);
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return normalizeIp(realIp);
  }

  return "unknown";
}

function cleanupBuckets(now: number) {
  if (buckets.size <= MAX_BUCKETS) {
    return;
  }

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit(request: Request, policy: RateLimitPolicy) {
  const ip = getClientIp(request);
  const now = Date.now();
  const key = `${policy.scope}:${ip}`;
  const existing = buckets.get(key);

  cleanupBuckets(now);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + policy.windowMs
    });
    return { ok: true as const };
  }

  existing.count += 1;

  if (existing.count > policy.limit) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      ok: false as const,
      retryAfterSec
    };
  }

  return { ok: true as const };
}

export function defaultRateLimitPolicies() {
  return {
    backupCreate: {
      scope: "backup-create",
      limit: parsePositiveInt(process.env.RATE_LIMIT_BACKUP_CREATE, 10),
      windowMs: 60 * 1000
    },
    backupList: {
      scope: "backup-list",
      limit: parsePositiveInt(process.env.RATE_LIMIT_BACKUP_LIST, 60),
      windowMs: 60 * 1000
    },
    backupDownload: {
      scope: "backup-download",
      limit: parsePositiveInt(process.env.RATE_LIMIT_BACKUP_DOWNLOAD, 10),
      windowMs: 60 * 1000
    },
    restoreUpload: {
      scope: "restore-upload",
      limit: parsePositiveInt(process.env.RATE_LIMIT_RESTORE_UPLOAD, 5),
      windowMs: 10 * 60 * 1000
    },
    restoreCommit: {
      scope: "restore-commit",
      limit: parsePositiveInt(process.env.RATE_LIMIT_RESTORE_COMMIT, 3),
      windowMs: 10 * 60 * 1000
    },
    restoreStatus: {
      scope: "restore-status",
      limit: parsePositiveInt(process.env.RATE_LIMIT_RESTORE_STATUS, 60),
      windowMs: 60 * 1000
    },
    exportJson: {
      scope: "export-json",
      limit: parsePositiveInt(process.env.RATE_LIMIT_EXPORT_JSON, 20),
      windowMs: 60 * 1000
    },
    exportCsv: {
      scope: "export-csv",
      limit: parsePositiveInt(process.env.RATE_LIMIT_EXPORT_CSV, 20),
      windowMs: 60 * 1000
    }
  };
}

export function isSameOriginRequest(request: Request) {
  const requestHost = normalizeHost(
    request.headers.get("x-forwarded-host") ??
      request.headers.get("host")
  );
  if (!requestHost) {
    return false;
  }

  const forwardedProto = normalizeForwardedProto(request.headers.get("x-forwarded-proto"));
  let requestProto = forwardedProto;
  if (!requestProto) {
    try {
      requestProto = new URL(request.url).protocol.replace(":", "").toLowerCase();
    } catch {
      requestProto = "";
    }
  }
  if (!requestProto) {
    return false;
  }

  const isAllowedOriginUrl = (rawUrl: string) => {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return false;
    }

    const originHost = normalizeHost(parsed.host);
    const originProto = parsed.protocol.replace(":", "").toLowerCase();

    return originHost === requestHost && originProto === requestProto;
  };

  const origin = request.headers.get("origin");
  if (origin) {
    if (!isAllowedOriginUrl(origin)) {
      return false;
    }
  } else {
    // Some user agents omit Origin for same-origin navigation/form posts.
    // In that case, require Referer to match same origin.
    const referer = request.headers.get("referer");
    if (!referer || !isAllowedOriginUrl(referer)) {
      return false;
    }
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site" && fetchSite !== "none") {
    return false;
  }

  return true;
}
