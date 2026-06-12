# Stage 2 Pilot Workflow Acceptance

Updated: June 11, 2026

| Requirement | Evidence | Status |
| --- | --- | --- |
| Lead create/update persists | API and live integration tests | Passed |
| Manager assignment is project-aware | secure assignment RPC and live tests | Passed |
| Deterministic explainable score | unit tests, persisted fields, Lead Detail | Passed |
| Handoff rules and duplicate suppression | unit and live integration tests | Passed |
| SLA deadlines and escalation | unit tests and persisted live records | Passed |
| Callback task generated | live integration test | Passed |
| Site visit confirm/complete/outcome | live mutation and Stage 2 tests | Passed |
| Post-visit task generated once | unique index and live integration test | Passed |
| Complete persisted timeline | timeline API and browser assertion | Passed |
| Executive assigned-lead visibility | RLS/live/browser tests | Passed |
| Executive settings restriction | Stage 1 security/browser regression tests | Passed |
| Cross-tenant denial | Stage 1 live security regression tests | Passed |
| Persisted dashboard/report metrics | dashboard, Pilot Report, reconciliation tests | Passed |
| Unsupported integrations labelled | UI assertions and source scan | Passed |
| Seed idempotency | two consecutive live seed runs | Passed |

Stage 2 acceptance remains conditional on the final combined verification run
recorded in `docs/STAGE_2_CORE_WORKFLOW_REPORT.md`.

## Stage 3 External Intake And Qualification

| Requirement | Evidence | Status |
| --- | --- | --- |
| Website, webhook, and manual intake | live API and browser tests | Passed |
| Invalid payload and webhook secret rejection | API tests | Passed |
| Sanitized raw payload and integration event | live database assertions | Passed |
| Tenant-scoped duplicate detection | duplicate and cross-tenant tests | Passed |
| India after-hours detection | unit and live tests | Passed |
| Validated AI JSON and unavailable fallback | unit and live tests | Passed |
| Deterministic score remains authoritative | contract and live workflow tests | Passed |
| Handoff, SLA, and callback trigger | live workflow and browser tests | Passed |
| Persisted internal alerts | live API and browser tests | Passed |
| Alert acknowledge and resolve | live API test | Passed |
| Inbox, detail, dashboard, timeline, report | Playwright and reconciliation tests | Passed |
| Stage 1 and Stage 2 regressions | full live and Playwright suites | Passed |

Stage 3 acceptance is recorded in
`docs/STAGE_3_EXTERNAL_INTAKE_AI_QUALIFICATION_REPORT.md`.
