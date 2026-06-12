# PropIQ AI Stage 3 External Intake And AI Qualification Report

Updated: June 12, 2026

## Verdict

**STAGE 3 COMPLETE**

## 1. Features Implemented

- authenticated website and manual JSON intake;
- secret-authenticated public webhook intake;
- normalized lead, sanitized raw intake, integration event, and audit records;
- tenant-scoped phone, email, and project duplicate detection;
- India Monday-Saturday 10:00-19:00 after-hours detection;
- validated structured AI qualification interface with unavailable fallback;
- deterministic Stage 2 workflow trigger;
- persisted internal alerts and lifecycle actions;
- Stage 3 inbox, lead detail, dashboard, alerts, timeline, and Pilot Report UI.

## 2. Files Changed

The final Git diff is the authoritative file list. It includes one forward-only
migration, intake and alert routes, qualification and intake workflow services,
UI contracts and screens, tests, and Stage 3 documentation.

## 3. Database Changes

Migration `202606120001_stage_3_external_intake.sql` adds Stage 3 lead metadata
and creates:

- `lead_intake_events`;
- `lead_duplicate_events`;
- `integration_events`;
- `internal_alerts`.

RLS is enabled on every new table. Raw intake, duplicate, and integration tables
do not grant authenticated browser access.

## 4. Intake Routes

- `POST /api/intake/website`
- `POST /api/intake/manual`
- `POST /api/intake/webhook/:organizationSlug`

All routes enforce body validation, project resolution, organization scope,
bounded payload storage, and safe errors.

## 5. Duplicate Detection

Phone values are normalized to digits and emails to lowercase. Checks are
limited to the selected organization and include phone, email, phone plus
project, and email plus project. Duplicate intake creates explicit evidence,
an intake note, an integration event, an audit record, and a duplicate alert.
The existing lead is not overwritten.

## 6. AI Extraction

The strict JSON contract accepts qualification signals only. Local controlled
extraction and truthful `NOT_AVAILABLE` fallback are implemented. Invalid output
fails safely without blocking lead creation. AI cannot assign, authorize, select
a tenant, or set deterministic score or priority.

## 7. Deterministic Workflow Result

Validated fields are persisted and passed to the existing `stage-2-v1`
workflow. Live verification proved AI-derived site-visit, negotiation,
compliance, and human-request signals produced deterministic HOT scoring,
handoffs, an SLA event, and a callback task.

## 8. Alert Logic

HOT, priority HOT, SLA due, SLA breach, manager escalation, after-hours
high-intent, duplicate, and assignment-required alerts are persisted. Active
types are deduplicated per lead. Acknowledge and resolve actions are protected
and audit logged.

## 9. Dashboard And UI

- Lead Inbox shows source, AI status, duplicate, and after-hours state.
- Lead Detail shows intake metadata, AI confidence and signals, deterministic
  score, handoffs, SLA, alerts, and intake timeline events.
- Dashboard shows external intake, HOT intake, duplicate intake, and validated
  AI qualification counts from persisted records.
- Internal Alerts supports review, acknowledge, and resolve.
- Pilot Report includes persisted Stage 3 intake and alert metrics.

## 10. Security Model

Protected routes derive organization scope from authenticated membership.
Webhook requests require constant-time secret validation. Service-role access is
server-only. Raw payload keys are redacted and bounded. Cross-tenant duplicate
searches and alert access are denied. No secret is logged or returned.

## 11. Tests Added

- India business-hours boundary tests;
- structured AI contract, invalid output, unavailable fallback, mapping, and
  redaction tests;
- webhook authentication and schema security tests;
- live Stage 3 intake, duplicate, cross-tenant, workflow, alert, and lifecycle
  tests;
- Stage 3 Playwright intake-to-dashboard test;
- Stage 3 reporting reconciliation.

## 12. Test Results

- Seed run 1: passed.
- Seed run 2: passed.
- Full live unit/API/security/workflow suite: 89 passed, 0 failed, 0 skipped.
- Full Playwright suite: 6 passed, 0 failed, 0 skipped.
- Lint: passed.
- Type-check: passed.

## 13. Build Result

Production client and server builds passed. The main client chunk is 611.27 kB
(182.78 kB gzip), so Vite reports the existing P1 size warning.

## 14. Audit Result

`npm audit --audit-level=high` reported 0 vulnerabilities.

The linked Supabase database lint reported no schema errors. Local and remote
migration histories match through `202606120001`.

## 15. Secret Scan

The final value-based scan checked 4 configured credential-like values against
all Git-tracked files:

- exact configured-value hits: 0;
- forbidden tracked environment, backup, build, test-result, or coverage
  artifacts: 0.

No secret value was printed.

## 16. Remaining Blockers

There are no P0 Stage 3 blockers.

The existing 611.27 kB client chunk warning remains a P1 performance follow-up.
An approved production AI provider and external notification delivery remain
intentionally `Not available`.

## 17. Completion

Stage 3 external lead intake and AI qualification foundation is complete on
`stage-3/external-intake-ai-qualification`. The final commit is created after
this report is finalized and is not merged automatically.

Stage 4 may begin after the Stage 3 commit is reviewed and accepted.
