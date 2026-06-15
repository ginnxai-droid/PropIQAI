# Production Hardening

## Runtime Controls

- Production requires a server-only Supabase service-role key.
- Production allowed origins cannot contain `localhost`.
- CORS uses the configured allowlist.
- Helmet security headers are enabled.
- JSON bodies are limited to 256 KB.
- API requests use rate limiting.
- Public webhook intake requires the configured secret and validated payload.
- API and database failures use safe user-facing errors.

The service-role key is never imported into the client. Configuration health
returns presence booleans only.

## Deployment Checklist

1. Set production Supabase URL, anon key, and server-only service-role key.
2. Set a unique webhook secret.
3. Set explicit HTTPS allowed origins and application URL.
4. Run typecheck, tests, production build, audit, migration checks, database
   lint, and secret scan.
5. Verify `/api/health`, `/api/health/db`, and `/api/health/config`.
6. Confirm unsupported integrations remain `Not available`.

Bundle splitting separates React, Motion, and Supabase vendor code while
preserving route-level lazy loading.
