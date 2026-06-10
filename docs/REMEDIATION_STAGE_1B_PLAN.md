# PropIQ AI Stage 1B Live Verification and Closure Plan

## Scope

Stage 1B validates the existing Stage 1 secure foundation against an isolated,
non-production Supabase environment. It does not add Stage 2 workflows,
redesign the UI, or add external integrations.

The active repository is `C:\Users\ADMIN\Documents\PropIQAI\source` on branch
`remediation/stage-1-secure-foundation`. Stage 1 changes are currently
uncommitted and must remain reviewable until every closure criterion passes.

## 1. Remaining Stage 1 Blockers

1. Apply every migration successfully to a clean Supabase PostgreSQL 15
   environment.
2. Seed and verify two isolated organizations with the required users and
   business records.
3. Execute all live tenant-isolation tests with no skipped security cases.
4. Validate login, session persistence, logout, disabled access, password
   recovery, invitation acceptance, and membership creation.
5. Validate OWNER, MANAGER, EXECUTIVE, and ADMIN permissions against live RLS.
6. Verify core data persists across refresh, re-authentication, and API restart.
7. Reconcile dashboard and pilot-report metrics with direct database queries.
8. Complete a backup and restore drill in a disposable environment.
9. Run final type checking, tests, build, dependency audit, and secret scans.

## 2. Required Supabase Configuration

Use only an isolated development or test project. Required local environment
values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SEED_DEFAULT_PASSWORD`
- `APP_URL`
- `API_PORT`
- `ALLOWED_ORIGINS`

Secrets must be stored in an ignored `.env.local` or equivalent file. They must
not be printed, written to reports, bundled into client code, or committed.
Supabase Auth must allow the local `/reset-password` URL and any isolated test
deployment callback URL used during verification.

## 3. Migrations To Apply

Apply these files in repository order:

1. `supabase/migrations/202606090001_stage_1_schema.sql`
2. `supabase/migrations/202606090002_stage_1_rls.sql`
3. `supabase/migrations/202606090003_secure_assignment_rpc.sql`
4. `supabase/migrations/202606090004_auth_profile_sync.sql`
5. `supabase/migrations/202606090005_site_visit_lead_status.sql`
6. `supabase/migrations/202606090006_membership_integrity.sql`

If clean application fails, record the exact database error, fix the migration
source, reset or recreate the disposable environment, and rerun the full chain.
Do not patch the database manually through the dashboard.

## 4. Tests Currently Skipped

`tests/tenant-isolation.integration.test.ts` currently skips its live suite
unless `RUN_SUPABASE_INTEGRATION_TESTS=true`. Its existing three cases cover:

- distinct organization visibility;
- blocking Organization A reads of Organization B leads;
- blocking Organization A updates of Organization B leads.

Stage 1B must expand and execute live coverage for cross-tenant projects,
executive scope, manager tenant boundaries, disabled memberships, manipulated
IDs, direct RLS access, and append-only audit logs.

## 5. Authentication Flows To Validate

- successful login;
- session persistence after refresh;
- logout and post-logout rejection;
- invalid password handling;
- disabled membership handling;
- password recovery request and callback;
- new password submission;
- user invitation and acceptance;
- correct profile, organization membership, role, and project access creation.

## 6. Tenant-Isolation Scenarios To Validate

- Organization A cannot read or update Organization B leads.
- Organization A cannot read Organization B projects.
- URL, body, query, or record-ID manipulation cannot cross tenant boundaries.
- EXECUTIVE access is limited to assigned or permitted project records.
- MANAGER and ADMIN remain organization-scoped.
- Disabled memberships immediately lose application and direct database access.
- Unauthenticated API requests return an authentication error.
- RLS blocks direct client queries outside active membership.
- Authenticated users cannot update or delete audit records.

## 7. Backup And Restore Validation Procedure

1. Create a logical backup from the isolated source project using credentials
   with the required database privileges.
2. Provision a disposable empty target database of a compatible PostgreSQL
   version.
3. Restore schema and data without using a production target.
4. Verify organizations, memberships, projects, leads, conversations, handoffs,
   site visits, tasks, SLA events, and audit logs by table counts and sampled
   relationships.
5. Run representative login and tenant-isolation checks against the restored
   environment.
6. Destroy the disposable target after retaining non-sensitive evidence.

The exact commands, permissions, limitations, ownership, and recommended
frequency will be recorded in `docs/BACKUP_AND_RESTORE.md`.

## 8. Exact Files That May Be Changed

Planned Stage 1B files:

- `docs/REMEDIATION_STAGE_1B_PLAN.md`
- `docs/BACKUP_AND_RESTORE.md`
- `docs/REMEDIATION_STAGE_1B_REPORT.md`
- `tests/tenant-isolation.integration.test.ts`
- `tests/schema-security.test.ts`
- `scripts/seed.ts`
- `server/routes/bootstrap.ts`
- `server/routes/dashboard.ts`
- `src/context/AppContext.tsx`
- `src/components/DashboardView.tsx`
- `src/components/PilotReportView.tsx`
- `.env.example`
- `README.md`

Migration files under `supabase/migrations/` may be changed only when a clean
live migration run demonstrates a source defect. Package or configuration files
may be changed only if required to run repeatable Stage 1B verification.

## 9. Final Stage 1 Closure Criteria

Stage 1 may close only when:

- all migrations apply from a clean environment;
- the required two-organization seed completes without exposing credentials;
- all required live tenant-isolation checks execute and pass;
- password recovery and invitation flows work end to end;
- role and disabled-membership enforcement is confirmed;
- core records persist across refresh, re-authentication, and API restart;
- reporting values match persisted records and unavailable metrics remain
  truthful;
- backup and restoration are demonstrated in a disposable environment;
- no service-role credential or other real secret reaches source control or the
  browser bundle;
- lint, type checking, the complete test suite, production build, dependency
  audit, and secret scan pass;
- the Stage 1B report contains actual evidence and no skipped blocker is
  reported as passed.

No commit or Stage 2 work will begin until these criteria pass.
