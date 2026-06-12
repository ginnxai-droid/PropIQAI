# PropIQ AI Stage 3 External Intake And AI Qualification Plan

Updated: June 12, 2026

## 1. Stage 1 And Stage 2 Foundation

Stage 1 provides authenticated organization membership, tenant-scoped RLS,
project-aware access, protected audit logs, secure assignment, secret hygiene,
and verified backup and recovery procedures.

Stage 2 provides persisted lead qualification, deterministic `stage-2-v1`
scoring, priority assignment, handoff rules, SLA deadlines and escalation,
callback tasks, site-visit workflow, truthful dashboard metrics, and a complete
lead timeline.

Stage 3 will add external intake and AI-assisted signal extraction without
changing those authority boundaries. AI output is advisory input. The Stage 2
server workflow remains the only authority for score, priority, handoffs, SLA,
and generated tasks.

## 2. Existing Workflow Dependencies

Stage 3 depends on:

- `createAuthMiddleware` and organization membership for protected intake and
  alert management;
- the service-role server client for narrowly scoped public webhook processing;
- `runLeadWorkflow` for deterministic scoring and workflow side effects;
- project-aware lead assignment and existing RLS policies;
- append-only audit records;
- bootstrap, dashboard, and lead timeline APIs;
- the current lead, handoff, SLA, task, and reporting UI contracts.

## 3. Files To Modify

- `.env.example`
- `server/app.ts`
- `server/auth.ts`
- `server/authorization.ts`
- `server/config.ts`
- `server/routes/bootstrap.ts`
- `server/routes/dashboard.ts`
- `server/routes/leads.ts`
- `server/validation.ts`
- `server/workflow/orchestrator.ts`
- `scripts/seed.ts`
- `src/App.tsx`
- `src/components/DashboardView.tsx`
- `src/components/LeadDetailView.tsx`
- `src/components/LeadInboxView.tsx`
- `src/components/PilotReportView.tsx`
- `src/components/Sidebar.tsx`
- `src/context/AppContext.tsx`
- `src/types.ts`
- `tests/app.test.ts`
- `tests/schema-security.test.ts`
- `docs/PILOT_WORKFLOW_ACCEPTANCE.md`

## 4. Files To Create

- `supabase/migrations/202606120001_stage_3_external_intake.sql`
- `server/routes/intake.ts`
- `server/routes/alerts.ts`
- `server/workflow/aiQualification.ts`
- `server/workflow/businessHours.ts`
- `server/workflow/intake.ts`
- `server/workflow/alerts.ts`
- `src/components/AlertsView.tsx`
- `tests/ai-qualification.test.ts`
- `tests/business-hours.test.ts`
- `tests/stage-3-intake.integration.test.ts`
- `tests/e2e/stage-3.spec.ts`
- `docs/AI_QUALIFICATION_CONTRACT.md`
- `docs/WEBHOOK_INTAKE_SECURITY.md`
- `docs/INTEGRATION_EVENT_LOG.md`
- `docs/ALERT_RULES.md`
- `docs/STAGE_3_EXTERNAL_INTAKE_AI_QUALIFICATION_REPORT.md`

## 5. Database Changes

A forward-only Stage 3 migration will:

- add intake source metadata, AI status, AI confidence, AI signals, duplicate
  metadata, received time, channel, campaign, preferred location, raw intake
  reference, and business-hours version to `leads`;
- add `lead_intake_events` for sanitized normalized and raw intake evidence;
- add `lead_duplicate_events` linking an intake event to the existing lead;
- add `integration_events` for processing state, safe errors, retry count, raw
  payload reference, created lead, and duplicate lead;
- add `internal_alerts` with type, severity, lifecycle, assigned role, and
  timestamps;
- add tenant-scoped indexes and foreign keys;
- enable RLS and reuse organization membership/access helpers;
- keep raw payloads server-readable only and prevent browser writes.

## 6. API Changes

The API will add:

- `POST /api/intake/website`: authenticated website-form intake;
- `POST /api/intake/manual`: authenticated JSON test intake;
- `POST /api/intake/webhook/:organizationSlug`: public webhook intake guarded
  by `x-propiq-webhook-secret`;
- `GET /api/alerts`: protected tenant-scoped alert list;
- `PATCH /api/alerts/:alertId`: acknowledge or resolve an alert.

Bootstrap, dashboard summary, and lead timeline responses will include the new
persisted Stage 3 records needed by the UI.

## 7. UI Changes

- Lead Inbox will show source metadata, AI status, duplicate state, and
  after-hours state.
- Lead Detail will show the intake record, validated AI signals, confidence,
  status, and Stage 3 timeline events.
- Dashboard will show intake, HOT intake, duplicate, and after-hours intake
  counts from persisted records.
- Alerts will be a dedicated internal page with acknowledge and resolve actions.
- Pilot Report will add persisted intake and AI qualification metrics.
- Unsupported external delivery and production AI integrations will display
  `Not available`.

## 8. AI Extraction Approach

`AiQualificationService` will expose one structured extraction method. The
initial implementation supports:

- a deterministic local extractor for tests and development;
- an unavailable implementation when no validated provider is configured.

The extractor returns JSON only and is validated with Zod before persistence.
Invalid output is rejected as AI output, recorded as `FAILED`, and does not
prevent lead creation. AI cannot assign a user, select an organization, alter
permissions, or persist score and priority.

Validated signals map only to existing qualification fields:

- budget range;
- purchase timeline;
- buyer intent and engagement;
- site-visit interest;
- handoff signals;
- preferred project and location;
- summary, questions, and objections.

## 9. Webhook Intake Approach

The webhook route is mounted before user authentication but uses:

- organization slug lookup;
- constant-time secret comparison against the server-only configured secret;
- payload size limits and Zod validation;
- organization and project verification on the server;
- rate limiting;
- sanitized errors;
- an integration event for every accepted processing attempt;
- no secret values in logs, payload records, or responses.

Website and manual routes remain authenticated and derive the organization from
the active membership rather than accepting tenant identifiers from the body.

## 10. Duplicate Detection

Phone numbers will be normalized to digits and emails to lowercase. Duplicate
checks are limited to one organization and consider:

- same normalized phone;
- same normalized email;
- same normalized phone and project;
- same normalized email and project.

Duplicates do not overwrite the existing lead. Stage 3 stores the intake event,
duplicate event, integration event, optional conversation note, and a duplicate
alert linked to the existing lead. Responses expose only the matched lead in
the already-authorized organization.

## 11. Alerting Approach

Persisted alerts will be generated idempotently for:

- HOT lead;
- priority HOT lead;
- SLA due soon;
- SLA breached;
- manager escalation;
- after-hours high-intent lead;
- duplicate lead detected.

Alert refresh is tied to deterministic workflow and SLA refresh. Stage 3 does
not deliver email, SMS, WhatsApp, push, or telephony notifications.

## 12. Security Model

- Authenticated routes derive tenant scope from membership.
- Public webhook scope is selected only by a server-resolved organization slug
  and validated server secret.
- Service-role access stays in server modules and is never exposed to browser
  code.
- RLS remains enabled for all Stage 3 tables.
- Raw payloads are sanitized by dropping secret-like keys and limiting depth,
  collection size, string length, and total request size.
- Duplicate checks never search or disclose across organizations.
- AI output is untrusted input and must pass a strict schema.
- Audit and integration logs use safe metadata and safe errors.
- Existing Stage 1 and Stage 2 authorization and deterministic workflow rules
  remain unchanged.

## 13. Test Plan

Unit tests:

- business-hours boundaries in `Asia/Kolkata`;
- valid, invalid, and unavailable AI output;
- AI-to-qualification mapping;
- raw payload sanitization and normalization;
- deterministic scoring remains authoritative.

API and live integration tests:

- website, webhook, and manual intake;
- malformed payload and invalid secret rejection;
- raw intake, source, campaign, audit, and integration event persistence;
- phone, email, project, and cross-tenant duplicate behavior;
- duplicate and after-hours alerts;
- AI-driven handoffs, SLA, and tasks;
- alert list, acknowledge, and resolve;
- RLS and unauthenticated route checks.

Browser tests:

- submit intake;
- locate the lead in Lead Inbox;
- inspect Stage 3 qualification and deterministic score in Lead Detail;
- verify handoff, SLA, alert, and dashboard changes.

Final verification will run the seed twice, all required test suites without
skips, database lint and migration checks, TypeScript checks, production build,
dependency audit, and tracked-file secret scan.

## 14. Risks

- A public webhook can become a tenant discovery or spam surface. The route
  therefore uses a non-secret slug only with a required server secret, generic
  errors, and rate limiting.
- Raw payloads may contain credentials or excessive personal data. Sanitization
  and bounded storage are mandatory.
- AI output may be malformed, misleading, or unavailable. Validation and
  graceful fallback prevent it from blocking intake or controlling workflow.
- Existing project-specific phone uniqueness can race with duplicate checks.
  Database conflict handling must convert this into an explicit duplicate event.
- Unassigned external leads cannot receive an assigned handoff, SLA, or task.
  Intake will select an eligible project executive deterministically when
  available; otherwise the lead persists and a manager-facing alert records the
  assignment gap.
- Live verification changes a shared Supabase test project. Test records need
  deterministic markers and cleanup.

## 15. Acceptance Criteria

Stage 3 is complete only when:

1. All three intake routes safely accept valid input and reject invalid input.
2. Normalized leads, intake events, integration events, audit records, source,
   campaign, channel, received time, and business-hours state persist.
3. Duplicate phone/email/project matches create explicit duplicate evidence
   without overwriting or leaking across tenants.
4. AI JSON is strictly validated, unavailable AI does not block intake, and AI
   cannot set score, priority, assignment, permissions, or tenant scope.
5. Validated qualification signals feed the existing deterministic Stage 2
   workflow.
6. Required handoffs, SLA records, callback tasks, alerts, timeline records,
   dashboard metrics, and Pilot Report metrics are persisted and truthful.
7. Alerts can be listed, acknowledged, and resolved with tenant isolation.
8. Raw payload and integration records contain no configured secrets.
9. Stage 1 security and Stage 2 workflow regression tests pass.
10. Seed idempotency, live tests, Playwright, database checks, type-check,
    production build, audit, and secret scan pass with no required test skipped.
11. The final report records exact evidence and any remaining blocker.
12. Passing work is committed on
    `stage-3/external-intake-ai-qualification` and is not merged automatically.
