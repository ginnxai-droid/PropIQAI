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
