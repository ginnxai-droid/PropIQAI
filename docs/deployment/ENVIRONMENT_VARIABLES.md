# Environment Variables

## Rules

- Do not commit real values.
- Use placeholders in documentation only.
- Enter real values through the hosting platform secret/environment UI.
- Keep `.env.local`, `.env.production`, `.env.staging`, and
  `.env.database-closure.local` ignored.
- Keep `.env.example` placeholder-only.

## Required Demo/Staging Variables

| Variable | Scope | Example placeholder | Notes |
| --- | --- | --- | --- |
| `SUPABASE_URL` | API server | `<DEMO_SUPABASE_URL>` | Server Supabase project URL. |
| `SUPABASE_ANON_KEY` | API server | `<DEMO_SUPABASE_ANON_KEY>` | Public anon key used by server-side Supabase clients where needed. |
| `SUPABASE_SERVICE_ROLE_KEY` | API server only | `<DEMO_SUPABASE_SERVICE_ROLE_KEY>` | Never expose through browser variables. |
| `VITE_SUPABASE_URL` | Browser build | `<DEMO_SUPABASE_URL>` | Browser Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Browser build | `<DEMO_SUPABASE_ANON_KEY>` | Browser anon key only. |
| `ALLOWED_ORIGINS` | API server | `<HTTPS_DEMO_FRONTEND_ORIGIN>` | Comma-separated exact origins. |
| `APP_URL` | API server | `<HTTPS_DEMO_FRONTEND_URL>` | Used for redirects and app links. |
| `API_PORT` | API server | `<HOST_ASSIGNED_PORT>` | Use provider default if assigned dynamically. |
| `INTAKE_WEBHOOK_SECRET` | API server only | `<DEMO_INTAKE_WEBHOOK_SECRET>` | Required for authenticated webhook intake. |
| `SEED_DEFAULT_PASSWORD` | Seed/runtime task only | `<DEMO_SEED_PASSWORD>` | Store separately; do not document the value. |
| `PILOT_DATA_MODE` | Reset/generation task only | `development` | Required for guarded synthetic data generation. |
| `AI_QUALIFICATION_MODE` | API server | `unavailable` | Use unavailable mode unless a provider is approved later. |

## Optional Email Variables

SMTP/Auth email settings depend on the selected provider. Store them only in
Supabase or the hosting platform. Do not place SMTP usernames, passwords, API
keys, or provider secrets in Git.

## Ignored File Confirmation

The repository ignores `.env*` and explicitly allows only `.env.example`.
Therefore `.env.local`, `.env.production`, `.env.staging`, and
`.env.database-closure.local` must remain untracked.
