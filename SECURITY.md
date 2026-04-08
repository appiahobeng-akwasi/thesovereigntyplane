# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in this project, please report it privately to appiahk4@gmail.com. Do not open a public issue.

## Architecture

- The visitor-facing site is entirely static HTML served from Vercel's edge network
- No database calls, API keys, or backend code executes in the visitor path
- The Supabase database is queried only at build time
- Row-level security on all tables restricts anonymous access to read-only
- The service role key is used only during initial seeding and is stored exclusively in Vercel environment variables

## Security Headers

All responses include:
- Strict-Transport-Security (HSTS with preload)
- Content-Security-Policy (no inline scripts, no eval, self-only sources)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy (no camera, microphone, geolocation)
