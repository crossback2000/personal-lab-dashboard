import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    const hardenedCsp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob:",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'"
    ].join("; ");
    const enforceHardenedCsp = !toBoolean(process.env.SECURITY_CSP_REPORT_ONLY, true);
    const enforcedCsp = enforceHardenedCsp
      ? hardenedCsp
      : "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";

    const baseHeaders = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff"
      },
      {
        key: "X-Frame-Options",
        value: "DENY"
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin"
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()"
      },
      {
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin"
      },
      {
        key: "Cross-Origin-Resource-Policy",
        value: "same-origin"
      },
      {
        key: "X-Permitted-Cross-Domain-Policies",
        value: "none"
      },
      {
        key: "Content-Security-Policy",
        value: enforcedCsp
      }
    ];

    if (!enforceHardenedCsp) {
      baseHeaders.push({
        key: "Content-Security-Policy-Report-Only",
        value: hardenedCsp
      });
    }

    if (process.env.NODE_ENV === "production") {
      baseHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload"
      });
    }

    return [
      {
        source: "/:path*",
        headers: baseHeaders
      }
    ];
  }
};

export default nextConfig;
