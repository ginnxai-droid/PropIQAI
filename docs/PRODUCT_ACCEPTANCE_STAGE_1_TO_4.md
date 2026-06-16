# Product Acceptance: Stage 1 To Stage 4

Updated: June 16, 2026

## Acceptance Decision

**Product accepted for pilot-demo preparation, not yet production deployment.**

This acceptance covers the completed Stage 1 through Stage 4 product scope and
the Stage 4 deep end-to-end validation gate. It does not authorize Stage 5, a
production deployment, a merge, or a push.

## 1. Stage 1 Accepted Evidence

Stage 1 is accepted as the secure foundation and database closure baseline.

Accepted evidence:

- Final closure verdict: **STAGE 1 CLOSED**.
- Clean disposable restore target before replay: 0 public base tables.
- Migration replay: 6 of 6 migrations passed.
- Migration history: 6 expected versions recorded.
- Row-level security: 12 of 12 application tables enabled with 30 policies.
- Target seed run 1 and run 2: passed.
- Source application backup: passed.
- Disposable-target restore: passed.
- Source/target reconciliation: 12 of 12 tables matched.
- Restored tenant-isolation suite: 54 of 54 passed, 0 skipped.
- Restored Playwright suite: 4 of 4 passed, 0 skipped.
- Lint, type-check, production client/server build, dependency audit, and
  tracked-file secret scan: passed.
- Manual invitation, recovery, Executive authorization, cross-tenant denial,
  and logout-route evidence were recorded separately from automated tests.

Stage 1 remaining issue accepted as non-blocking:

- Historical main client chunk-size warning was a P1 performance follow-up, not
  a Stage 1 security or recoverability blocker.

## 2. Stage 2 Accepted Evidence

Stage 2 is accepted as the core revenue recovery workflow.

Accepted evidence:

- Verdict: **STAGE 2 COMPLETE**.
- Persisted lead creation, qualification update, assignment, conversations,
  tasks, handoff, site visit, and timeline workflow implemented.
- Server-authoritative deterministic score and priority implemented.
- Handoff signal capture, automatic per-reason handoffs, persisted SLA
  deadlines, breach state, escalation level, callback tasks, and idempotent
  post-visit task generation implemented.
- Dashboard and Pilot Report metrics persisted from tenant-scoped records.
- Unsupported integrations displayed truthful `Not available` states.
- Seed run 1 and run 2: passed.
- Live unit/API/security/workflow tests: 71 passed, 0 failed, 0 skipped.
- Full Playwright suite: 5 passed, 0 failed, 0 skipped.
- Lint, type-check, production client/server build, high-severity dependency
  audit, linked database lint, and secret scan: passed.

Stage 2 remaining issue accepted as non-blocking:

- Historical main client chunk-size warning remained a P1 performance follow-up.

## 3. Stage 3 Accepted Evidence

Stage 3 is accepted as the external intake and AI qualification layer.

Accepted evidence:

- Closure verdict: **STAGE 3 CLOSED**.
- Manual-review fix verdict: **STAGE 3 READY FOR MANUAL RE-REVIEW**.
- External intake routes implemented:
  - `POST /api/intake/manual`
  - `POST /api/intake/website`
  - `POST /api/intake/webhook/:organizationSlug`
- Intake validation, normalization, lead creation, metadata persistence,
  tenant-scoped duplicate detection, India business-hours after-hours
  detection, AI qualification, deterministic Stage 2 workflow triggering,
  internal alerts, and Stage 3 UI surfaces implemented.
- Visible Lead Inbox Add Lead flow was corrected to submit through
  `POST /api/intake/manual`, exposing persisted Stage 3 metadata and reviewer
  evidence in Lead Detail.
- AI-unavailable behavior validated: `NOT_AVAILABLE` is explicit, reviewer
  signals still feed deterministic Stage 2 scoring and workflow processing, and
  AI does not make final score, priority, assignment, authorization, or security
  decisions.
- Focused Stage 3 API, qualification, and intake tests: 17 passed.
- Full live unit/API/security/workflow suite: 90 passed, 0 failed, 0 skipped.
- Full Playwright suite: 6 passed, 0 failed, 0 skipped.
- Stage 3 E2E closure run: 3 passed, 0 failed.
- Stage 3 intake integration: 6 passed, 0 failed.
- Security regression coverage: 47 passed, 0 failed.
- Lint, type-check, production build, and migration history check: passed.

Stage 3 remaining risks accepted as non-blocking for pilot-demo preparation:

- Production external AI provider remains intentionally not enabled; fallback
  behavior is validated.
- Earlier dependency and bundle-size risks were later addressed during Stage 4
  hardening.

## 4. Stage 4 Accepted Evidence

Stage 4 is accepted as pilot-readiness and production-hardening scope for
pilot-demo preparation.

Accepted evidence:

- Verdict: **COMPLETE**.
- Persisted role-specific Owner, Manager, Executive, and Admin pilot dashboards
  implemented.
- Tenant-scoped pilot KPI reporting and explicit unavailable metrics
  implemented.
- Seven operational queues with severity filtering and lead-detail navigation
  implemented.
- Development-only, resettable synthetic pilot data implemented.
- API, database, and configuration health checks implemented.
- Request IDs, structured logs, startup validation, safe errors, provider
  availability, integration failure visibility, route-level lazy loading, and
  vendor chunk splitting implemented.
- No Stage 4 migration was required; Stage 4 uses the existing Stage 1-3 schema.
- All eight local migrations matched the linked database.
- Live Vitest: 19 files, 97 tests passed, 0 failed, 0 skipped.
- Standard Playwright: 11 passed, 0 failed, 0 skipped.
- AI-unavailable Playwright: 1 passed, 0 failed, 0 skipped.
- Final required Stage 4 total: 109 passed, 0 failed, 0 skipped.
- Vite production client build, esbuild server build, seed twice, pilot data
  generation, Supabase database lint, migration check, lint, type-check,
  high-severity audit, and tracked source secret scan: passed.
- Previous Vite main-chunk warning and high-severity dependency audit findings
  were resolved.

Stage 4 remaining limitations accepted as non-blocking:

- Real external WhatsApp, telephony, Meta Lead Ads, CRM sync, revenue
  attribution, and paid export remain intentionally out of scope and display
  `Not available`.

## 5. Deep E2E Validation Result

The Stage 4 deep end-to-end validation gate is accepted.

Validation result:

- Verdict: **PASS - Stage 4 accepted by the deep automated acceptance gate**.
- Branch validated: `qa/stage-4-deep-e2e-validation`.
- Product baseline validated:
  `f1ea1fb76be5786e51fbd10a7c81aa64b8f2c9f7`.
- QA evidence commit:
  `62ffa2f test: add deep Stage 4 end-to-end validation`.
- Development seed completed twice.
- Pilot data generation completed twice with `PILOT_DATA_MODE=development`.
- Owner, Admin, Manager, and Executive role coverage passed.
- Full lead journey, duplicate detection, AI-unavailable behavior, handoff and
  SLA behavior, site-visit lifecycle, operational queues, dashboards, Pilot KPI
  reconciliation, observability, integration readiness, security, database
  verification, static checks, build checks, audit, and secret scan passed.
- Vitest files: 19 passed.
- Vitest tests: 98 passed, 0 failed, 0 skipped.
- Unique acceptance tests: 13 passed, 0 failed, 0 skipped.
- Total browser executions including focused reruns: 17 passed.
- Full default Playwright suite: 12 passed.
- AI-unavailable configuration: 1 passed.
- Focused Stage 4 rerun: 3 passed.
- Focused deep-evidence rerun: 1 passed.
- Linked database lint: passed with no schema errors.
- Local and remote migration histories matched for all eight migrations.
- Lint, typecheck, production build, and high-severity audit: passed.
- Secret scan: 153 tracked files scanned, 0 generic secret-pattern hits, 0
  sensitive variable-name hits in `src` and `dist`, 0 configured-value hits in
  tracked files.
- Remaining Stage 4 acceptance blockers found by this gate: none.

## 6. Remaining Non-Blocking Limitations

The following limitations do not block pilot-demo preparation, but they remain
outside accepted production-deployment readiness:

- Stage 5 has not started and is not authorized by this acceptance document.
- Production deployment has not been authorized.
- Product approval for production remains a separate user decision.
- Real external WhatsApp, telephony, Meta Lead Ads, CRM sync, revenue
  attribution, and paid export are not implemented; the product reports these
  as `Not available`.
- Production external AI provider autonomy is not enabled; unavailable fallback
  behavior is validated.
- Deep E2E screenshots are stored in ignored test evidence output and are not a
  committed product artifact.
- This document does not authorize merge or push.

## 7. Explicit Decision

Based on the accepted Stage 1 through Stage 4 evidence and the passing deep
end-to-end validation gate:

**PropIQ AI is accepted for pilot-demo preparation.**

**PropIQ AI is not yet accepted for production deployment.**

This decision preserves the current boundary: prepare and demonstrate the
pilot-ready product, but do not start Stage 5, do not merge, do not push, and do
not treat the product as production-deployed.
