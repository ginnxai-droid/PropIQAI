# Stage 4 Pilot Readiness And Production Hardening Plan

## 1. Prior Stage Summary

### Stage 1

- Established the Supabase-backed multi-tenant data model, authentication,
  organization membership, role authorization, row-level security, secure
  assignment, and backup/restore closure.
- Stage 1 is closed.

### Stage 2

- Added deterministic lead qualification, priority scoring, handoffs, SLA
  events, follow-up tasks, site visits, persisted timelines, and role-aware
  operational workflow.
- Stage 2 is complete.

### Stage 3

- Added authenticated website/manual intake, secret-authenticated webhook
  intake, duplicate detection, India business-hours detection, structured AI
  qualification with a truthful `NOT_AVAILABLE` fallback, integration events,
  internal alerts, and reviewer-visible intake metadata.
- The visible Lead Inbox flow now submits through `POST /api/intake/manual`.
- Stage 3 is complete. Its local acceptance hardening changes must be preserved
  and included in Stage 4 verification.

## 2. Current Architecture

- React 19 and Vite client with role-aware navigation and an application context
  loaded from `GET /api/bootstrap`.
- Express API with Supabase authentication, organization context, role
  authorization, Zod validation, Helmet, CORS, JSON payload limits, and rate
  limiting.
- Supabase PostgreSQL persistence with RLS for organizations, projects,
  memberships, leads, handoffs, SLA events, tasks, site visits, conversations,
  audit logs, Stage 3 intake events, integration events, and internal alerts.
- Deterministic Stage 2 workflow services and Stage 3 intake/AI services.
- Vitest/Supertest integration and security tests plus Playwright browser tests.

## 3. Stage 4 Scope

1. Persisted role-specific pilot dashboards for Owner, Manager, Executive, and
   Admin.
2. A reconciled pilot KPI report with explicit unavailable metrics.
3. Operational queues derived from tenant-scoped persisted records.
4. Production-friendly health checks, request IDs, structured logs, startup
   validation, and safe errors.
5. A development-only, resettable synthetic pilot data generator.
6. Integration readiness status and failure visibility without full external
   integrations.
7. Production hardening verification and low-risk bundle optimization.
8. Complete unit, API, security, workflow, and Playwright coverage.
9. Deployment and pilot-demo documentation.

## 4. Explicit Out Of Scope

- Stage 5.
- WhatsApp automation.
- Telephony or AI voice calling.
- Payment processing.
- Channel partner portal.
- Inventory engine.
- Full CRM replacement.
- Meta Lead Ads or CRM synchronization.
- Paid PDF/export services.
- Enterprise monitoring platforms.
- Fake or estimated recovery revenue.
- Automatic merge or push.

## 5. Files To Modify

- `package.json`
- `vite.config.ts`
- `server/app.ts`
- `server/config.ts`
- `server/errors.ts`
- `server/index.ts`
- `server/routes/bootstrap.ts`
- `server/routes/dashboard.ts`
- `src/App.tsx`
- `src/context/AppContext.tsx`
- `src/types.ts`
- `src/components/DashboardView.tsx`
- `src/components/PilotReportView.tsx`
- `src/components/AlertsView.tsx`
- `src/components/Header.tsx`
- `src/components/Sidebar.tsx`
- Existing tests and Playwright configuration where required.

## 6. Files To Create

- `server/observability.ts`
- `server/routes/health.ts`
- `server/routes/pilot.ts`
- `server/services/pilotMetrics.ts`
- `server/services/operationalQueues.ts`
- `server/services/integrationRegistry.ts`
- `scripts/pilot-data.ts`
- `src/components/OperationalQueuesView.tsx`
- `src/components/HealthStatusView.tsx`
- `src/components/IntegrationStatusView.tsx`
- `tests/stage-4-pilot.test.ts`
- `tests/stage-4-observability.test.ts`
- `tests/stage-4-synthetic-data.integration.test.ts`
- `tests/e2e/stage-4.spec.ts`
- `playwright.stage4.config.ts`
- Required Stage 4 documentation listed in the specification.

## 7. Database Changes

- Prefer the existing Stage 1-3 schema for dashboard metrics and queues.
- Add a migration only if a required status cannot be represented safely by the
  existing `integration_events`, `internal_alerts`, or workflow tables.
- Synthetic data will use existing tables and deterministic identifiers so it
  can be reset safely.
- No production customer or buyer data will be used.

## 8. API Changes

- Extend `GET /api/dashboard` or add `GET /api/pilot/dashboard` with
  role-specific, tenant-scoped persisted metrics.
- Add `GET /api/pilot/report`.
- Add `GET /api/pilot/queues` with role-aware queue visibility.
- Add `GET /api/integrations/status` or an equivalent pilot endpoint.
- Add public-safe `GET /api/health`, `GET /api/health/db`, and
  `GET /api/health/config`.
- Attach a request ID to every request and response.
- Preserve the existing structured error envelope while adding request IDs and
  preventing stack-trace leakage.

## 9. UI Changes

- Adapt the current Dashboard screen by role rather than redesigning it.
- Add a persisted Pilot KPI Report section/page.
- Add an Operational Queues page with filters, severity, ownership, timestamps,
  and lead-detail navigation.
- Add an Admin-only Health/Status page.
- Add Integration Readiness status showing unsupported providers as
  `Not available`.
- Keep the existing Stage 3 visual language and responsive navigation.

## 10. Reporting Changes

- Reconcile source, priority, SLA, duplicate, after-hours, site visit, handoff,
  workload, alert, AI coverage, and integration failure metrics from persisted
  records.
- Show revenue opportunity as `Not available`.
- Provide export-ready semantic sections and a safe local text/JSON structure;
  do not add a paid export integration.

## 11. Observability Changes

- Generate or propagate `X-Request-Id`.
- Emit structured JSON request/startup/error logs without secrets or request
  bodies.
- Add safe health checks for process, database connectivity, and configuration
  presence.
- Surface integration event failures and pilot health in the UI.

## 12. Production Hardening Changes

- Validate environment and allowed origins at startup.
- Keep strict payload limits, secure headers, and rate limiting.
- Verify webhook validation and safe error handling.
- Ensure the service-role key remains server-only.
- Add explicit tests for secret redaction, stack-trace suppression, request IDs,
  tenant isolation, and unauthorized access.
- Attempt low-risk route/component lazy loading and vendor chunk splitting.

## 13. Test Plan

### Unit And API

- Role-specific dashboard metrics and unavailable values.
- Pilot report reconciliation.
- Queue classification, due times, severity, and role visibility.
- Integration registry and failure counts.
- Health endpoints, request IDs, safe configuration, and safe error responses.

### Integration And Security

- Cross-tenant dashboard and queue isolation.
- Executive lead restrictions.
- Invalid webhook secret rejection.
- Synthetic data development guard, repeatability, reset behavior, and fake-data
  markers.
- No service-role key or stack traces in client/API responses.

### Playwright

- Owner dashboard.
- Manager queue/SLA dashboard.
- Executive assigned-action dashboard.
- Pilot KPI report.
- Queue-to-lead-detail navigation.
- Admin health/status secrecy.
- Unsupported integrations display `Not available`.
- Existing Stage 1B, Stage 2, and Stage 3 journeys remain passing.

### Required Verification

- Run the seed twice.
- Run the full non-skipped live test suite and Stage 4 tests.
- Run all Playwright suites.
- Run Supabase database lint and migration checks.
- Run lint, typecheck, and production build.
- Run `npm audit --audit-level=high`.
- Run a configured secret scan over tracked/staged files.

## 14. Risks

- Existing local Stage 3 acceptance changes are uncommitted and must not be
  overwritten.
- Live Supabase tests require configured credentials and may expose data cleanup
  defects if synthetic identifiers are not deterministic.
- Dashboard calculations can drift if duplicated in client and server; Stage 4
  will centralize calculations server-side.
- Broad bootstrap payloads may become expensive at pilot volume; role dashboard
  and queue APIs should return bounded aggregates and rows.
- Bundle splitting can alter loading behavior; changes must remain low-risk and
  Playwright-covered.
- Existing historical test data can affect absolute metrics; tests must use
  baselines or deterministic isolated organizations.

## 15. Acceptance Criteria

- Owner, Manager, and Executive dashboards show only persisted, tenant-scoped
  metrics relevant to their roles.
- Revenue opportunity is visibly `Not available`.
- The KPI report reconciles to persisted records.
- Every required operational queue is available with filtering and lead-detail
  navigation.
- Health endpoints and UI expose operational state without secrets.
- Integration readiness and failures are visible; unsupported providers show
  `Not available`.
- Synthetic pilot data is fake, development-only, resettable, and repeatable.
- No required tests are skipped.
- Two seed runs, full tests, Playwright, database checks, lint, typecheck, build,
  audit, and secret scan pass.
- Bundle optimization is attempted and its result is documented truthfully.
- Stage 4 documentation is complete.
- A final local commit is created only after all acceptance checks pass.
- No merge or push occurs.
