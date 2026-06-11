# PropIQ AI Stage 2 Core Revenue Recovery Workflow Report

Updated: June 11, 2026

## Verdict

**STAGE 2 COMPLETE**

## 1. Features Implemented

- persisted lead create, qualification update, assignment, conversation, task,
  handoff, site visit, and complete timeline workflow;
- server-authoritative deterministic score and priority;
- explicit handoff signal capture and automatic per-reason handoffs;
- persisted SLA deadlines, breach state, and escalation level;
- callback task generation;
- idempotent post-visit task generation;
- persisted dashboard and Pilot Report metrics;
- truthful `Not available` states for unsupported integrations.

## 2. Files Changed

The implementation adds a Stage 2 migration, workflow services, SLA and timeline
APIs, Stage 2 UI updates, seed changes, unit/live/browser tests, and Stage 2
documentation. The final Git diff is the authoritative file list.

## 3. Database Changes

Migration `202606110001_stage_2_core_workflow.sql` adds scoring metadata,
qualification inputs, handoff escalation, visit-linked tasks, uniqueness
constraints, indexes, and the project-aware assignment RPC revision.

## 4. Scoring Logic

Version `stage-2-v1` uses the documented 30/25/15/15/10/5 weighted model. The
server persists the total, priority, components, explanation, version, and
recalculation timestamp.

## 5. Handoff Logic

All nine specified reasons are supported. Active duplicates are prevented per
lead and reason. Assignment requires active organization and project access.

## 6. SLA Logic

Urgent HOT uses 5 minutes, score-only HOT 10 minutes, WARM the same/next
business day, NURTURE 48 hours, and COLD no urgent SLA. Levels 0 through 4 are
persisted.

## 7. Site Visit Workflow

Create, confirm, reschedule, missed, completed, outcome, corrected dashboard
metrics, and one post-visit follow-up task per completed visit are implemented.

## 8. Dashboard Changes

The dashboard uses persisted records for total, new, qualified, HOT, confirmed
visits, completed visits, SLA breaches, after-hours leads, missed calls
responded, and source distribution. Revenue opportunity remains null.

## 9. Tests Added

- deterministic scoring unit tests;
- handoff-rule unit tests;
- SLA engine unit tests;
- live Stage 2 workflow integration test;
- owner/manager/Executive Playwright workflow.

## 10. Tests Passed, Failed, And Skipped

- Seed run 1: passed.
- Seed run 2: passed.
- Live unit/API/security/workflow tests: 71 passed, 0 failed, 0 skipped.
- Full Playwright: 5 passed, 0 failed, 0 skipped.
- Lint: passed.
- Type-check: passed.

## 11. Build Result

Production client and server builds passed. The main client chunk is 610.61 kB
(182.59 kB gzip), so Vite continues to report the existing size warning.

## 12. Audit Result

`npm audit --audit-level=high` reported 0 vulnerabilities.

The linked Supabase database lint reported no schema errors.

## 13. Secret Scan Result

The final scan compared 10 configured credential-like values from ignored
environment files against every Git-tracked file:

- exact configured-value hits: 0;
- forbidden tracked environment, backup, build, and test artifacts: 0.

No secret value was printed by the scan.

## 14. Remaining Blockers

There are no P0 Stage 2 blockers.

The existing 610.61 kB main client chunk warning remains a P1 performance
follow-up.

## 15. Completion

Stage 2 core revenue recovery is complete. The final commit is created on
`stage-2/core-revenue-workflow` after this report is finalized. It is not merged
automatically.

Stage 3 may begin after this Stage 2 commit is reviewed and accepted.
