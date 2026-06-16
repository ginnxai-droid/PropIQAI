# Stage 5A Secure Demo Environment And Deployment Readiness Plan

Updated: June 16, 2026

## 1. Current Release Baseline Summary

Current branch: `stage-5a/secure-demo-environment`

Baseline status:

- Stage 1 is closed.
- Stage 2 is complete.
- Stage 3 is complete.
- Stage 4 is complete.
- Deep E2E validation passed.
- Product is accepted for pilot-demo preparation.
- Product is not yet accepted for production deployment.
- Stage 5 pre-check recommends Deployment Readiness + Secure Demo Environment.

Stage 5A prepares a safe hosted demo/staging environment. It is not production
deployment, real customer onboarding, WhatsApp automation, telephony, CRM sync,
payment, inventory, channel partner, paid export, or production AI autonomy.

## 2. Stage 5A Scope

Stage 5A scope is limited to:

- deployment-readiness documentation;
- provider-neutral hosting guidance;
- placeholder-only environment guidance;
- demo/staging Supabase checklist;
- demo data reset runbook;
- demo access checklist;
- post-deployment smoke-test command flow;
- rollback and demo-reset runbook;
- safe validation scripts/tests where they do not change product behavior.

## 3. Explicit Out-Of-Scope Items

Stage 5A does not include:

- WhatsApp automation;
- telephony;
- AI voice calling;
- CRM synchronization;
- payment module;
- inventory engine;
- channel partner portal;
- paid PDF export;
- production external AI autonomy;
- real buyer-data onboarding;
- production deployment approval;
- database migrations;
- product workflow redesign;
- merge or push.

## 4. Proposed Deployment Target Assumptions

Stage 5A should stay provider-neutral, with a simplest safe path:

- deploy the API and frontend to a hosted demo/staging target;
- use a dedicated Supabase demo/staging project;
- use synthetic pilot data only;
- enter secrets through hosting-provider environment variable controls;
- keep local `.env.local`, closure files, backup files, screenshots, and test
  artifacts out of Git;
- run smoke checks after every deploy.

Render or Railway are the simplest single-service options for a non-technical
builder. Fly.io is more operationally powerful but needs more CLI discipline.
Vercel can host the frontend, but the API still needs a separate host.

## 5. Environment Variables Required

Required demo/staging variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `ALLOWED_ORIGINS`
- `APP_URL`
- `API_PORT`
- `INTAKE_WEBHOOK_SECRET`
- `SEED_DEFAULT_PASSWORD`
- `PILOT_DATA_MODE=development`
- SMTP/Auth provider settings if password reset or invitation email is tested

All documentation must use placeholders only. No real values may be committed.

## 6. Secret-Handling Approach

- Store secrets only in the hosting platform, Supabase dashboard, local ignored
  environment files, or a password manager.
- Never add real secrets to `.env.example`, docs, scripts, tests, screenshots,
  build output, or Git history.
- Keep `.env.local`, `.env.production`, `.env.staging`, and
  `.env.database-closure.local` ignored.
- Health and config endpoints may expose boolean readiness checks, not secret
  values.
- Logs must not include request bodies, authorization headers, cookies,
  database URLs, service-role keys, webhook secrets, or seed passwords.

## 7. Demo/Staging Supabase Requirements

The demo Supabase project must be dedicated to demo/staging use:

- no real buyer data;
- all migrations applied;
- RLS enabled and verified;
- seeded Owner/Admin/Manager/Executive users;
- Auth redirect URLs configured for the demo domain;
- SMTP or Supabase email settings configured if password reset and invitations
  are tested;
- service-role key stored only server-side;
- anon key exposed only where required by the browser client;
- resettable synthetic pilot data namespace.

## 8. Demo Data Reset Approach

Use the existing `npm run seed` and `PILOT_DATA_MODE=development npm run
pilot-data` commands for demo data preparation.

The reset process must:

- run only in demo/development mode;
- use fake `.test` or reserved local-style data only;
- avoid real buyer data;
- reset only the demo namespace;
- reseed Owner/Admin/Manager/Executive test users;
- regenerate realistic fake leads, duplicates, after-hours cases, alerts, site
  visits, SLA breaches, and AI-unavailable cases;
- be repeatable;
- fail closed if production mode is detected.

## 9. Access-Control Checklist

Stage 5A must verify:

- Owner demo account can access Owner dashboard, Pilot KPI Report, Health, and
  Integration Status.
- Admin demo account can access manual Stage 3 intake.
- Manager demo account can access management queue and operational views.
- Executive demo account sees assigned work and cannot access management-only
  or owner-only routes.
- Password reset readiness is documented without exposing passwords.
- Invitation email readiness is documented without exposing credentials.
- Protected routes reject unauthenticated users.
- Unauthorized access checks remain visible in smoke testing.
- Logout works.

## 10. Health-Check Requirements

Required demo health checks:

- application loads;
- `/api/health` returns OK;
- `/api/health/db` reports reachable database or explicit degraded status;
- `/api/health/config` hides secret values and reports readiness booleans only;
- Integration Status shows unavailable providers accurately.

## 11. Smoke-Test Requirements

Post-deployment smoke testing must verify:

- app loads;
- API health passes;
- DB health passes;
- config health hides secrets;
- login works;
- Owner dashboard loads;
- Manager queue loads;
- Executive queue loads;
- Pilot KPI Report loads;
- Integration Status shows unavailable providers correctly;
- manual intake creates a fake lead;
- score appears;
- handoff/SLA appears;
- operational queue opens Lead Detail;
- no secrets appear in UI or API responses.

This is demo-environment acceptance, not full product retesting.

## 12. Rollback/Demo-Reset Runbook Approach

The runbook must cover:

- resetting demo data;
- recovering if seed fails;
- rotating demo passwords;
- disabling demo access;
- checking logs safely;
- rolling back deployment;
- confirming no real customer data is present;
- cleaning test artifacts.

Rollback should prefer redeploying the last known-good commit and rerunning the
smoke checklist.

## 13. Risks

- Demo users may treat demo readiness as production approval.
- Hosting misconfiguration can break Auth redirects, CORS, or API access.
- Secrets may be accidentally copied into docs, logs, screenshots, or Git.
- Demo reset could be dangerous if pointed at a real production project.
- Email delivery setup may be provider-specific.
- A public demo URL increases exposure to brute-force and rate-limit concerns.
- A split frontend/API host can create origin and cookie confusion.

## 14. Acceptance Criteria

Stage 5A can close only when:

- all required Stage 5A docs exist;
- placeholder-only environment guidance exists;
- local ignored environment files remain untouched;
- demo reset runbook documents production guard behavior;
- smoke-test flow is documented or safely scripted;
- health/config guidance confirms secrets are hidden;
- hosting options are compared with a safe recommendation;
- tests for demo reset guards, repeatability, environment examples, health
  secrecy, integration unavailable status, smoke flow, secret scan, and build
  pass or are covered by existing verified tests;
- seed, test, E2E, lint, typecheck, build, audit, and secret scan pass with no
  required skipped tests;
- no secrets, backups, screenshots, or environment files are committed;
- a local commit is created only after verification passes;
- no merge or push is performed.
