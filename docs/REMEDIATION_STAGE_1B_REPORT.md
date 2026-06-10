# PropIQ AI Stage 1B Live Verification Report

## Final Verdict

**STAGE 1 CLOSED**

Updated: June 11, 2026

The user manually verified invitation receipt/acceptance and password-recovery
email receipt/reset. Clean migration replay, target seeding, encrypted
application backup, disposable-target restore, reconciliation, and restored
security verification are complete. Stage 2 was not started in this run.

## 1. Supabase Project Type Used

An isolated non-production Supabase project was used. Credentials remain in the
ignored `.env.local` file and were not printed or added to source control. No
production project was accessed.

## 2. Migration Results

`supabase migration list --linked` confirmed that all six local migrations
match the linked project:

1. `202606090001_stage_1_schema.sql`
2. `202606090002_stage_1_rls.sql`
3. `202606090003_secure_assignment_rpc.sql`
4. `202606090004_auth_profile_sync.sql`
5. `202606090005_site_visit_lead_status.sql`
6. `202606090006_membership_integrity.sql`

`supabase db lint --linked --level warning` completed with no schema errors.
On June 11, 2026, all six migrations were replayed in filename order against
the empty `propiq-ai-stage1-restore-test` project. The target then contained 12
RLS-enabled application tables, 30 policies, 12 public functions, 15 triggers,
and all six expected migration-history records.

## 3. Seed Root Cause And Fix

The original `Assign project: no data returned` failure occurred when an
existing `organization_member_projects` relationship was inserted with an
upsert that ignored duplicates and then called `select().single()`. PostgreSQL
correctly ignored the duplicate, PostgREST returned no row, and `requireData()`
treated the empty response as a failure.

`assignProject()` now uses the composite conflict target
`organization_id,membership_id,project_id`, sets `ignoreDuplicates: false`, and
returns the inserted or updated row. All seed helpers use deterministic
conflict keys. Existing auth users receive the configured development-only
password, refreshed metadata, and email confirmation on every run.

## 4. Seed Results

First final run: passed with `Development seed complete.`

Second final run: passed with `Development seed complete.`

The live idempotency test also runs the seed twice and confirms that seeded
table counts do not change. Development passwords and Supabase credentials are
not logged.

## 5. Authentication And Recovery

Playwright verified:

- owner, manager, and executive password login;
- role-specific controls derived from database membership;
- session survival across browser refresh;
- local-storage role tampering does not change the database role;
- logout and direct-route rejection after logout;
- safe invalid-password behavior;
- recovery-token callback, password update, old-password rejection, and
  new-password acceptance;
- restoration of the original development-only credential after the test.

The live tenant suite also verifies unauthenticated API rejection and disabled
membership revocation. Seeded users are email-confirmed.

Recovery token/callback behavior and password replacement pass. Actual delivery
of a recovery email, reset-link receipt, password reset, and updated-password
login were subsequently manually verified by the user. Automated provider
delivery was previously blocked by `over_email_send_rate_limit`; mailbox
delivery remains manual evidence rather than automated coverage.

## 6. Invitation Results

Invitation provisioning logic is implemented and locally verified. The route
provisions the Auth user, profile, organization membership, role, project
assignments, and audit event. If downstream provisioning fails, it deletes the
newly invited Auth user so cascading relationships cannot leave a partial
invite.

End-to-end invitation email receipt, acceptance, and invited-account login were
subsequently manually verified by the user. The earlier automated provider
probe returned `over_email_send_rate_limit`; invitation mailbox evidence is
therefore recorded as manual rather than automated.

## 7. Tenant Isolation And Roles

The live suite contains 13 security scenarios covering:

- cross-tenant organization, project, lead read, and lead update isolation;
- executive project and lead scope;
- executive project/member management API denial;
- executive cross-tenant lead API denial;
- manager and admin organization scope;
- admin-to-owner escalation prevention;
- unauthenticated API rejection;
- manipulated IDs and organization headers;
- disabled membership revocation;
- append-only audit logs.

All scenarios pass. Browser assertions additionally verify that only owner/admin
can manage projects, managers cannot manage projects, and executives cannot
create leads or handoffs.

### Manual Executive Authorization Verification

On June 10, 2026, the user manually verified the live invited account
`ginnxai@gmail.com` with role `EXECUTIVE` in `PropIQ Demo Builders`.

The following checks are recorded as **manually verified**, not automated:

- Projects opened successfully, while create, edit, deactivate, and delete
  controls were unavailable.
- Settings & Webhook exposed no mutable secret, webhook, API, integration,
  organization, user-management, or role-management controls.
- Lead Inbox showed only assigned or permitted leads.
- A Boundary Test Builders lead URL opened after switching to this Executive
  account displayed `Page not found` and exposed no buyer, contact, budget,
  project, score, conversation, or visit data.
- After logout, reopening `/dashboard` returned the browser to `/login`.

These observations are consistent with the implemented controls:

- API project mutations require `projects:manage`, which `EXECUTIVE` lacks.
- Organization/member mutations require `members:manage`, which `EXECUTIVE`
  lacks.
- PostgreSQL `can_access_project` and `can_access_lead` restrict executives to
  assigned/permitted project and lead rows.
- The project UI hides create/edit controls for executives.
- Settings & Webhook is informational only; Stage 1 has no settings or webhook
  mutation route.
- `/dashboard` is an explicit protected application route.

Automated coverage separately verifies Executive project mutation denial,
organization-member management denial, read-only settings/webhook
presentation, assigned/permitted lead scope, cross-tenant lead denial,
logged-out `/dashboard` redirection, and unauthenticated API rejection.

## 8. Persistence Results

The browser workflow creates and updates a project, creates a lead, updates its
qualification and score, records a conversation, creates or updates a handoff,
reloads the browser, logs out, opens a new browser context, logs in again, and
finds the persisted data.

Assignments create persisted handoffs, tasks, and SLA events through the secure
assignment RPC. Dedicated live API tests now verify:

- follow-up task creation, status update, notes update, role authorization,
  cross-tenant rejection, direct persistence, and visibility after re-login;
- site-visit creation, status update, outcome update, rescheduling,
  unauthenticated rejection, cross-tenant rejection, and visibility after
  re-login.

Data created by earlier browser invocations also remained visible after fresh
API/Vite server processes started in later invocations.

## 9. Reporting Accuracy

`docs/REPORTING_DATA_DICTIONARY.md` defines every Stage 1 metric, source field,
filter, formula, and limitation. The dashboard now includes every persisted
lead source and clamps impossible negative response durations to zero.

Visit metrics are separated as follows:

- Confirmed Site Visits: status is exactly `CONFIRMED`.
- Completed Site Visits: status is exactly `COMPLETED`.
- Active Visit Records: status is anything except `CANCELLED`.

The dashboard's primary visit card displays Confirmed Site Visits. A unit test
covers requested, tentative, confirmed, completed, missed, rescheduled, and
cancelled statuses without describing all active records as bookings.

The live reporting reconciliation test compares `/api/dashboard/summary` with
direct service-role queries constrained to the same organization. It passes.
Revenue opportunity remains explicitly `null` because Stage 1 has no defensible
revenue-value model.

## 10. Backup And Restore Results

Supabase CLI version: `2.105.0`.

Source and target project references were different. Supabase project metadata
confirmed that the target was the healthy, dedicated
`propiq-ai-stage1-restore-test` project. It contained zero public base tables
before migration replay.

The database credentials in `.env.database-closure.local` did not authenticate
through the IPv4 pooler, and direct database hosts required unavailable IPv6
connectivity. The source password was not rotated. Instead, the authenticated
Supabase Management API exported all 12 application-owned public tables.

The 126-row backup was immediately encrypted with Windows DPAPI CurrentUser:

- artifact:
  `backups/stage-1-closure/20260611-002505/propiq-stage-1-public.json.dpapi`;
- size: 92,406 bytes;
- SHA-256:
  `BA8E8CA5D0CEB32EC8A2A101D984E17AB97C246A4DF7BDB42BEABF17AF280F00`.

The target seed passed twice. The backup then restored into the target in one
transaction. Target Auth users were synchronized by email, and
`profiles.auth_user_id` was remapped because Auth UUIDs are project-specific.
All six target accounts authenticated and were email-confirmed.

Final reconciliation matched counts and deterministic content hashes for all
12 tables and 126 rows, excluding only `profiles.auth_user_id`. There were zero
orphaned relationships, zero duplicate project assignments, and zero disabled
user triggers.

## 11. Test Results

- Target `npm run seed`: passed.
- Target `npm run seed` second run: passed.
- Restored-target `RUN_SUPABASE_INTEGRATION_TESTS=true npm test`: 54 passed,
  0 failed, 0 skipped.
- Dedicated task/site-visit mutation suite: 6 passed, 0 failed, 0 skipped.
- Restored-target `npm run test:e2e`: 4 passed, 0 failed, 0 skipped.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- Tracked-file secret scan: passed. No database URL, password, service-role key,
  or other sensitive configured value was found in tracked files.

## 12. Bundle Result

The original client bundle was approximately 1.11 MB before gzip. Operational
views are now lazy-loaded. The final build emitted:

- main client chunk: 610.71 kB, 182.63 kB gzip;
- dashboard/chart chunk: 410.95 kB, 119.93 kB gzip;
- individual operational view chunks: 2.63 kB to 23.90 kB.

The main chunk still exceeds Vite's 500 kB warning threshold, so further vendor
splitting remains P1 work rather than a Stage 1 security blocker.

## 13. Files Changed In This Closure Run

The closure work added or updated:

- seed and seed idempotency coverage;
- task and site-visit live mutation coverage;
- manual Executive authorization evidence and matching automated API/browser
  coverage;
- separated confirmed, completed, and active site-visit metrics;
- server authorization, validation, bootstrap, configuration, lead,
  organization, dashboard, and handoff routes;
- application context and project, lead inbox, lead detail, dashboard,
  password recovery, and lazy-loading UI paths;
- Playwright configuration and Stage 1B browser tests;
- reporting reconciliation coverage and data dictionary;
- package scripts, dependencies, ignore rules, and this report.

The worktree also contains the broader uncommitted Stage 1 foundation from the
current remediation branch.

## 14. Remaining P0 Blockers

None.

The client bundle-size warning remains P1 performance work and does not block
Stage 1 closure. See `docs/STAGE_1_FINAL_CLOSURE.md`.

## 15. Commit Status

All Stage 1 closure criteria now pass. The final Stage 1 commit may be created
on the active remediation branch. Secrets, Supabase temporary metadata,
generated builds, test artifacts, and database backup artifacts remain
excluded.

Stage 2 was not started as part of this work.
