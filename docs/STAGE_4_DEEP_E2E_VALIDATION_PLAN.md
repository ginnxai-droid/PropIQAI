# Stage 4 Deep End-To-End Validation Plan

## Scope And Tested Commit

- Branch: `qa/stage-4-deep-e2e-validation`
- Baseline commit: `f1ea1fb76be5786e51fbd10a7c81aa64b8f2c9f7`
- Product scope: Stage 1 through Stage 4 only.
- No Stage 5 features, UI redesign, merge, push, or secret changes.

## Exact Test Areas

1. Authentication and role navigation for Owner, Admin, Manager, and Executive.
2. Full Stage 3 visible intake through qualification, scoring, handoff, SLA,
   task, timeline, alerts, dashboard, and KPI reporting.
3. Duplicate detection for phone, email, phone plus project, email plus
   project, raw-payload preservation, and cross-tenant isolation.
4. AI local qualification and truthful unavailable fallback.
5. Handoff rules, SLA timing and breaches, escalation, assignment, and tasks.
6. Site visit create, confirm, outcome, reschedule, complete/miss, and
   post-visit task idempotency.
7. All seven operational queues, severity filtering, role visibility,
   timestamps, and lead-detail navigation.
8. Owner, Manager, and Executive persisted dashboards.
9. Pilot KPI reconciliation and explicit unavailable revenue.
10. Health endpoints, request IDs, safe errors, logs, and secret redaction.
11. Integration registry, unavailable-provider labels, failed event visibility,
    and retry-ready fields.
12. Authentication, authorization, tenant isolation, tracked-secret, bundle,
    database, migration, audit, and production-build regressions.

## Test Data Strategy

- Run the development seed twice to prove repeatability.
- Run the Stage 4 pilot generator twice with
  `PILOT_DATA_MODE=development`.
- Use only deterministic `.test` addresses and reserved synthetic phone
  numbers.
- Use unique markers for test-created records and clean them after tests.
- Validate persisted records with a service-role test client; never expose that
  key to browser code or evidence.
- Preserve unrelated existing and cross-tenant records.

## Roles

- Owner: pilot metrics, report, queues, integrations, health, management access.
- Admin: full visible Stage 3 intake and workflow actions.
- Manager: SLA, workload, queues, reports, and owner-only denial.
- Executive: assigned workload and restricted navigation/data.

## Expected User Journeys

1. Admin creates a complete Stage 3 intake lead and verifies persisted metadata,
   deterministic workflow, timeline, actions, alerts, and metrics.
2. Admin submits duplicates and verifies original lead preservation and
   duplicate evidence.
3. Owner reviews pilot dashboard, every operational queue, KPI report,
   integration status, and health.
4. Manager reviews team SLA and escalation work without owner-only health
   controls.
5. Executive reviews only assigned actions and cannot access management pages.
6. AI-unavailable intake still produces truthful UI and deterministic workflow.
7. Site visits progress through their lifecycle and update persisted reporting.

## Commands

```powershell
npm run seed
npm run seed
$env:PILOT_DATA_MODE='development'; npm run pilot-data
$env:PILOT_DATA_MODE='development'; npm run pilot-data
$env:RUN_SUPABASE_INTEGRATION_TESTS='true'; npm test
npm run test:e2e
npx playwright test --config=playwright.stage3-unavailable.config.ts
npx playwright test --config=playwright.deep-e2e.config.ts
npx supabase db lint --linked
npx supabase migration list --linked
npm run lint
npm run typecheck
npm run build
npm audit --audit-level=high
```

## Screenshots And Evidence

The deep browser suite will save evidence under
`test-results/deep-e2e-evidence/`:

- Owner dashboard.
- Admin Lead Inbox Stage 3 intake form.
- Manager dashboard.
- Executive dashboard.
- Operational queues.
- Pilot KPI report.
- Health status.
- Integration readiness.

Command outputs, database reconciliation, test counts, defects, and fixes will
be recorded in `docs/STAGE_4_DEEP_E2E_VALIDATION_REPORT.md`.

## Risk Areas

- Linked Supabase latency can exceed generic unit-test timeouts.
- Existing synthetic duplicate alerts can invalidate tenant-global selectors.
- Historical records can affect absolute dashboard totals.
- Browser tests must use persisted baselines rather than hard-coded totals.
- Evidence files must not include credentials, authorization headers, or raw
  personal data.

## Acceptance Criteria

- Every required test executes with zero skips.
- All four roles authenticate and see only permitted navigation/data.
- The full visible lead journey persists and reconciles across UI and database.
- All duplicate combinations and tenant isolation pass.
- AI unavailable remains truthful and deterministic workflow continues.
- Handoff, SLA, task, visit, alert, queue, dashboard, and KPI checks pass.
- Health and integration surfaces expose no secrets or fake delivery claims.
- Database lint and migration reconciliation pass.
- Lint, typecheck, production build, high-severity audit, and secret scans pass.
- Screenshots are generated for all required pilot surfaces.
- Any acceptance defect is fixed only within Stage 4 behavior or test
  determinism.
- A local QA commit is created only after all checks pass; no merge or push.
