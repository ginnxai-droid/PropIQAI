# PropIQ AI Stage 2 Core Revenue Recovery Workflow Plan

Updated: June 11, 2026

## 1. Current Codebase Summary

PropIQ AI is a React/Vite client with an Express API and Supabase persistence.
Stage 1 established authentication, organization membership, role permissions,
project-scoped RLS, validated API mutations, audit logging, seed data,
dashboard reconciliation, and browser/security test coverage.

The current application already supports persisted lead creation and updates,
assignment, conversations, manual handoffs, tasks, site visits, SLA event
storage, dashboard metrics, and a Stage 1 lead-detail UI. Stage 2 will connect
these separate mutations into one deterministic revenue-recovery workflow.

Current gaps:

- lead score, priority, and SLA deadline can be supplied by the client;
- score components, scoring version, explanation, and recalculation time are
  not persisted;
- handoff reason and deadline are manually selected rather than derived;
- SLA breach and escalation values are not refreshed by a central engine;
- site-visit completion does not create an idempotent post-visit task;
- the lead detail screen does not expose a unified persisted timeline;
- some UI copy still refers to unavailable AI, WhatsApp, SMS, or telephony
  behavior and must be replaced with truthful availability states.

## 2. Existing Stage 1 Foundation Dependencies

Stage 2 depends on and will preserve:

- `server/auth.ts` authenticated request context;
- `server/authorization.ts` OWNER, ADMIN, MANAGER, and EXECUTIVE permissions;
- Stage 1 RLS helpers `can_access_project` and `can_access_lead`;
- organization-bound foreign keys introduced by the membership-integrity
  migration;
- validated mutation routes and `writeAuditLog`;
- corrected site-visit metrics in `src/lib/siteVisitMetrics.ts`;
- persisted `sla_events`, `handoffs`, `followup_tasks`, and `audit_logs`;
- the idempotent non-production seed and live Supabase test setup;
- Stage 1 backup, restore, reconciliation, and secret-handling controls.

Stage 1 migrations will not be rewritten. Stage 2 will use a new forward-only
migration.

## 3. Files To Modify

- `server/app.ts`
- `server/authorization.ts` only if a read-specific timeline or SLA permission
  is required; existing role boundaries otherwise remain unchanged
- `server/routes/leads.ts`
- `server/routes/handoffs.ts`
- `server/routes/siteVisits.ts`
- `server/routes/dashboard.ts`
- `server/routes/bootstrap.ts`
- `server/validation.ts`
- `scripts/seed.ts`
- `src/types.ts`
- `src/context/AppContext.tsx`
- `src/components/LeadInboxView.tsx`
- `src/components/LeadDetailView.tsx`
- `src/components/DashboardView.tsx`
- `src/components/PilotReportView.tsx`
- `src/components/SalesTasksView.tsx`
- `src/components/SiteVisitsView.tsx`
- `src/components/SlaAlertsView.tsx`
- relevant Stage 1 tests where response shapes gain Stage 2 fields

## 4. Files To Create

- `supabase/migrations/202606110001_stage_2_core_workflow.sql`
- `server/workflow/scoring.ts`
- `server/workflow/sla.ts`
- `server/workflow/handoffs.ts`
- `server/workflow/orchestrator.ts`
- `server/routes/sla.ts`
- `tests/scoring.test.ts`
- `tests/handoff-rules.test.ts`
- `tests/sla-engine.test.ts`
- `tests/stage-2-workflow.integration.test.ts`
- `tests/e2e/stage-2.spec.ts`
- `docs/STAGE_2_CORE_WORKFLOW_REPORT.md`
- `docs/SCORING_MODEL.md`
- `docs/HANDOFF_AND_SLA_RULES.md`
- `docs/PILOT_WORKFLOW_ACCEPTANCE.md`

## 5. Database Changes

The Stage 2 migration will:

1. Add lead scoring fields:
   - `score_components jsonb`
   - `scoring_version text`
   - `score_explanation text`
   - `recalculated_at timestamptz`
   - `engagement_quality`
   - `callback_responsiveness`
   - `handoff_signals jsonb`
2. Add `escalation_level` to handoffs.
3. Add `site_visit_id` to follow-up tasks for post-visit task idempotency.
4. Replace the one-active-handoff-per-lead index with an active
   lead-and-reason uniqueness rule, allowing distinct justified handoffs while
   preventing duplicate active handoffs for the same reason.
5. Add a unique post-visit task index on visit and task type.
6. Add checks for JSON object shape and accepted qualification values.
7. Add indexes required by score, deadline, active handoff, and visit-task
   queries.
8. Extend RLS policies to cover any new access path without weakening existing
   organization and project restrictions.

No Stage 1 table, policy, or migration will be removed.

## 6. API Changes

### Lead APIs

- Lead create and qualification update will accept qualification inputs but
  will ignore client-supplied score, priority, score components, and SLA
  deadline.
- The server will calculate and persist score and priority.
- Qualification updates, conversations, assignment, and site-visit requests
  will run the workflow orchestrator.
- `GET /api/leads/:leadId/timeline` will return a chronological union of
  persisted lead, conversation, assignment/audit, score, handoff, SLA, task,
  and site-visit events visible to the authenticated user.

### Handoff APIs

- Manual handoff creation will accept reason and assignee only.
- Priority, SLA deadline, status, and escalation level will be server-derived.
- Duplicate active handoffs for the same lead and reason will return the
  existing handoff instead of creating another record.

### SLA APIs

- `GET /api/sla` will refresh overdue/breach/escalation state and return records
  allowed by RLS.
- Bootstrap and dashboard reads will refresh overdue SLA state before returning
  data.

### Site Visit APIs

- Create, confirm, reschedule, miss, and complete remain validated mutations.
- A request creates the site-visit handoff rule when applicable.
- Completion with an outcome creates one persisted post-visit follow-up task
  per site visit.

## 7. UI Changes

The existing visual system will be retained.

- Lead Inbox: remove client score calculation and unsupported integration copy;
  display persisted score, priority, and SLA state.
- Lead Detail: qualification input without an editable score, score explanation
  card, component breakdown, handoff section, SLA card, visit section, and a
  complete persisted timeline.
- Sales Tasks: identify generated post-visit and workflow tasks.
- Site Visits: support confirm, reschedule, missed, completed, outcome, and
  truthful reminder availability.
- Dashboard: show persisted total, new, qualified, hot, confirmed visits,
  completed visits, SLA breaches, after-hours leads, missed calls responded,
  and source distribution.
- Pilot Report: use persisted Stage 2 workflow metrics and display unavailable
  integrations as `Not available`.
- SLA Alerts: render persisted escalation levels and remove claims of external
  SMS, WhatsApp, or automatic reassignment.

## 8. Scoring Rules

Scoring version: `stage-2-v1`.

Every component produces a normalized score from 1 to 10. The weighted total is
rounded to one decimal and clamped to 1 through 10.

### Budget Fit, 30%

Compare the buyer budget range with the selected project's price range:

- buyer range fully overlaps project range: 10
- buyer maximum reaches project minimum but overlap is partial: 8
- buyer maximum is within 10% below project minimum: 6
- buyer maximum is within 25% below project minimum: 4
- no usable budget or materially outside range: 1

### Purchase Timeline, 25%

- IMMEDIATE: 10
- WITHIN_3_MONTHS: 9
- THREE_TO_SIX_MONTHS: 7
- SIX_TO_TWELVE_MONTHS: 5
- LONG_TERM: 3
- UNKNOWN: 1

### Buyer Type And Intent, 15%

Base buyer-type values:

- FAMILY_BUYER, INVESTOR, FIRST_TIME_BUYER, or NRI: 7
- COMPARISON_SHOPPER: 5
- UNKNOWN: 2

Add two points for site-visit interest and one point for a booking or
price-negotiation signal, capped at 10.

### Engagement Quality, 15%

- HIGH: 10
- MEDIUM: 7
- LOW: 4
- UNKNOWN: 1

### Source Quality, 10%

- PHONE or MISSED_CALL: 9
- WEBSITE, GOOGLE, or PORTAL: 8
- EMAIL or MANUAL: 6
- META: 5
- WHATSAPP: 5, treated only as source attribution with no integration claim

### Callback Responsiveness, 5%

- RESPONSIVE: 10
- DELAYED: 6
- UNRESPONSIVE: 2
- UNKNOWN: 1

### Priority Mapping

- 8.0 through 10.0: HOT
- 6.0 through 7.9: WARM
- 4.0 through 5.9: NURTURE
- below 4.0: COLD

The persisted explanation will list each normalized component, weight, weighted
contribution, version, and final priority.

## 9. Handoff Rules

Immediate handoff reasons:

- HOT_LEAD when the calculated priority is HOT;
- SITE_VISIT_REQUEST when site-visit interest is true or a visit is created;
- PRICE_NEGOTIATION;
- BOOKING_REQUEST;
- LEGAL_RERA_QUERY for legal, RERA, payment, or possession commitment;
- ANGRY_BUYER for angry or confused buyers;
- HUMAN_REQUESTED;
- HIGH_BUDGET_BUYER when the buyer maximum budget meets or exceeds the selected
  project's maximum price;
- COMPETITOR_COMPARISON.

Signals are explicit validated qualification inputs and are persisted as an
object. The server maps them to enum reasons. It will not infer legal, emotional,
or competitor intent from arbitrary text.

The assignee is the lead assignee. If no assignee exists, the authenticated
actor is used only when that actor is an active project-permitted sales member;
otherwise the handoff remains pending until assignment and is created by the
assignment workflow.

Each active lead/reason pair is unique. Resolved handoffs may be created again
if the reason recurs.

## 10. SLA Rules

- urgent HOT handoff signal: 5 minutes;
- score-only HOT lead: 10 minutes;
- WARM lead: end of the current business day when created before 17:00 local
  time, otherwise end of the next business day;
- NURTURE lead: 48 hours;
- COLD lead: no urgent human SLA.

Business-day calculation uses the configured application timezone
`Asia/Calcutta` for this deployment and skips Saturday and Sunday.

Escalation is persisted:

- level 0: not overdue;
- level 1: overdue by less than 15 minutes;
- level 2: overdue by 15 to 29 minutes;
- level 3: overdue by 30 to 59 minutes;
- level 4: overdue by 60 minutes or more.

The engine sets `breached=true` when an incomplete SLA passes its deadline and
updates the related handoff escalation level. Manager/owner visibility is
provided by existing organization/project RLS. No external notification,
automatic reassignment, SMS, WhatsApp, or telephony action is claimed.

## 11. Test Plan

### Unit

- every scoring component and weighted result;
- all priority boundaries;
- score explanation;
- every handoff rule and duplicate suppression;
- 5-minute urgent HOT, 10-minute HOT, same-business-day WARM, 48-hour NURTURE,
  and no COLD SLA;
- breach and escalation levels;
- corrected confirmed, completed, active, and missed visit behavior.

### API And Live Supabase

- lead create, update, qualification, assignment, conversation, task, handoff,
  visit, and timeline persistence;
- automatic score, handoff, SLA, and task generation;
- post-visit task idempotency;
- manager assignment, owner organization-wide visibility, Executive restricted
  visibility, Executive settings denial, and cross-tenant denial;
- RLS and audit records for all Stage 2 mutations;
- seed idempotency after migration.

### Browser

- owner creates and updates a lead;
- manager assigns it;
- Executive sees an assigned permitted lead;
- score explanation, handoff, SLA, and visit appear;
- dashboard counts update from persisted data.

No required Stage 2 test will use a skipped assertion. Live tests remain gated
by credentials operationally, but final Stage 2 completion requires running
them with the gate enabled and observing zero skipped tests.

## 12. Risks

- Multi-record workflow mutations are not automatically transactional through
  separate Supabase HTTP requests. The orchestrator will be idempotent, use
  unique constraints, and fail visibly; critical duplicate prevention is
  enforced in the database.
- Business-day deadlines require explicit timezone behavior. Stage 2 will use
  one documented deployment timezone rather than the browser timezone.
- Existing seed values include Stage 1 scores. The seed must be updated so
  server-side Stage 2 calculation becomes authoritative.
- Historical Stage 1 rows need deterministic backfill through the Stage 2
  workflow or seed.
- UI copy currently overstates unavailable integrations. These claims must be
  removed without redesigning the application.
- The existing large client chunk may remain a P1 performance warning.

## 13. Acceptance Criteria

Stage 2 is complete only when:

1. The full lead workflow persists in Supabase.
2. Score and priority are calculated only by server-side `stage-2-v1` logic.
3. Components, explanation, version, and recalculation time are visible.
4. Every specified handoff reason is supported and duplicate active reasons
   are suppressed.
5. SLA deadlines, breaches, and escalation levels are persisted and visible.
6. Visit confirm/reschedule/missed/completed/outcome flows persist.
7. Visit completion creates one post-visit task.
8. The lead timeline is complete and based on persisted records.
9. Dashboard and Pilot Report show only persisted or explicitly unavailable
   values.
10. Stage 1 authorization, RLS, audit, and tenant isolation remain intact.
11. Seed passes twice.
12. Unit, API, security, live Supabase, and Playwright tests pass with zero
    required skips.
13. Lint, type-check, production build, dependency audit, and secret scan pass.
14. The Stage 2 report records actual evidence and remaining blockers.
15. Passing work is committed on `stage-2/core-revenue-workflow` and is not
    merged automatically.
