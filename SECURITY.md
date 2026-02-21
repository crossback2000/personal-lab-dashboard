# Security Policy

## Reporting a vulnerability
- Please do not open a public issue for security vulnerabilities.
- Report details privately to the repository maintainer first.
- Include:
  - affected version/commit
  - reproduction steps
  - impact assessment
  - suggested fix (optional)

## Scope notes
- This project stores personal lab data in local SQLite files.
- Never commit real personal health data to GitHub.
- Keep `.env` secrets out of source control.

## Hardening baseline in this repository
- Optional Cloudflare Access JWT verification (`ACCESS_MODE=cloudflare`)
- Fail-fast production guard via `REQUIRE_CLOUDFLARE_IN_PRODUCTION`
- Same-origin checks for state-changing backup/restore APIs
- IP-based rate limiting for backup/restore/export APIs
- Security headers configured in `next.config.ts`
