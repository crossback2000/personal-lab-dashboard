function normalized(value: string) {
  return value.trim().toLowerCase();
}

export function isCloudflareModeEnabled() {
  return normalized(process.env.ACCESS_MODE || "none") === "cloudflare";
}

export function shouldRequireCloudflareInProduction() {
  const raw = process.env.REQUIRE_CLOUDFLARE_IN_PRODUCTION;
  if (!raw) {
    return true;
  }

  const normalizedValue = normalized(raw);
  if (["0", "false", "no", "n", "off"].includes(normalizedValue)) {
    return false;
  }
  if (["1", "true", "yes", "y", "on"].includes(normalizedValue)) {
    return true;
  }
  return true;
}

export function isProxyTrusted() {
  const raw = process.env.TRUST_PROXY;
  if (!raw) {
    return false;
  }

  const normalizedValue = normalized(raw);
  if (["1", "true", "yes", "y", "on"].includes(normalizedValue)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalizedValue)) {
    return false;
  }
  return false;
}

function cloudflareAccessConfigReady() {
  const teamDomain = process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN?.trim();
  const audience = process.env.CLOUDFLARE_ACCESS_AUD?.trim();
  return !!teamDomain && !!audience;
}

export function getSecurityConfigError() {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    return null;
  }

  if (shouldRequireCloudflareInProduction() && !isCloudflareModeEnabled()) {
    return "Security configuration error: ACCESS_MODE must be cloudflare in production.";
  }

  if (isCloudflareModeEnabled() && !cloudflareAccessConfigReady()) {
    return "Security configuration error: CLOUDFLARE_ACCESS_TEAM_DOMAIN and CLOUDFLARE_ACCESS_AUD are required.";
  }

  return null;
}
