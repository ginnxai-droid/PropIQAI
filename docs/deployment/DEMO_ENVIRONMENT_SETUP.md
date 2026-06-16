# Demo Environment Setup

## Purpose

Set up a secure hosted demo/staging environment for PropIQ AI without starting
production deployment or real customer onboarding.

## Deployment Environment Checklist

- Use a dedicated demo/staging host.
- Use a dedicated Supabase demo/staging project.
- Use synthetic pilot data only.
- Enter secrets through the hosting platform environment variable UI.
- Keep `.env.local`, `.env.production`, `.env.staging`, and local secret files
  out of Git.
- Configure the public app URL before running browser smoke checks.
- Configure allowed origins to the exact hosted frontend URL.
- Confirm health endpoints do not expose secret values.
- Confirm unsupported integrations still show `Not available`.

## Frontend Build Checklist

- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as placeholder-free
  hosting variables only.
- Build with `npm run build`.
- Serve the frontend over HTTPS.
- Confirm the app loads and the login page does not display configuration
  errors.
- Confirm route lazy loading still works for dashboard, report, queues, health,
  and integration status.

## Backend/API Environment Checklist

- Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `ALLOWED_ORIGINS`, `APP_URL`, `API_PORT`, and `INTAKE_WEBHOOK_SECRET` in the
  API host.
- Keep the service-role key server-side only.
- Set `AI_QUALIFICATION_MODE=unavailable` unless a validated provider is
  explicitly approved later.
- Confirm CORS only allows the hosted frontend domain.
- Confirm request IDs are returned on success and error responses.
- Confirm logs do not include request bodies, authorization headers, cookies,
  stack traces, database URLs, passwords, or service-role keys.

## Supabase Demo Project Checklist

- Create a dedicated demo/staging project.
- Apply the current migration set.
- Confirm RLS is enabled.
- Configure Auth redirect URLs for the demo frontend.
- Configure email/SMTP only if password reset or invitations will be shown.
- Seed Owner, Admin, Manager, and Executive demo users.
- Generate synthetic pilot data with the guarded demo data flow.
- Do not import real buyer records.

## CORS And Allowed-Origin Checklist

- Use exact origins, not broad wildcards.
- Include the hosted frontend URL in `ALLOWED_ORIGINS`.
- Include localhost only in local/demo development, never production mode.
- Re-run health and login smoke checks after changing origins.

## SMTP/Auth Email Checklist

- Configure the provider in Supabase or the selected Auth email layer.
- Test password reset using a seeded demo account.
- Test invitation email readiness only with demo users.
- Do not put SMTP credentials in docs or source files.

## Seeded Test-User Checklist

- Owner demo account exists.
- Admin demo account exists.
- Manager demo account exists.
- Executive demo account exists.
- Password is read from ignored environment configuration.
- Password is not documented or shared in demo materials.
- Logout and protected route behavior are verified.

## Health Endpoint Checklist

- `GET /api/health` returns `status: ok`.
- `GET /api/health/db` returns reachable database status, or explicit degraded
  status if a server-only key is missing.
- `GET /api/health/config` returns presence booleans only.
- No health response contains Supabase keys, service-role keys, webhook secrets,
  passwords, database URLs, authorization values, or stack traces.

## Post-Deployment Smoke-Test Checklist

Run the documented smoke flow in
`docs/deployment/POST_DEPLOYMENT_SMOKE_TEST.md` after each deployment and after
each demo data reset.
