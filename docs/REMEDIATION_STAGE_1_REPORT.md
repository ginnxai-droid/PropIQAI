# Stage 1 Production-Readiness Report

## Final Status

**PASSED WITH CONDITIONS**

The repository now has a secure Stage 1 architecture and passes local
type-check, unit/API/security tests, production build, and dependency audit.
It is not approved for a controlled pilot until the migrations and live
tenant-isolation tests pass in an isolated Supabase project.

## Completed Work

- Replaced the client-only data prototype with Supabase-backed persistence.
- Added real Supabase login, session persistence, logout, and password recovery.
- Added protected, denied, and not-found route states.
- Removed the local role switcher and derives role from active membership.
- Added Express authentication, role authorization, Zod validation, sanitized
  errors, Helmet, CORS, body limits, and rate limiting.
- Added tenant-scoped PostgreSQL schema, constraints, indexes, RLS, helper
  functions, triggers, and audit logs.
- Added atomic lead assignment with handoff, callback, SLA, and audit writes.
- Persisted leads, projects, users, conversations, visits, tasks, statuses,
  outcomes, assignments, and reports.
- Removed production client sample data and added a development-only seed.
- Replaced fabricated pilot metrics and integration claims with measured values
  or explicit unavailable states.
- Added user-visible mutation error reporting.

## Schema Summary

The schema contains organizations, profiles, memberships, project access,
projects, leads, conversations, handoffs, site visits, follow-up tasks, SLA
events, and audit logs. Tenant-aware constraints prevent cross-organization
lead/project references. Contact, status, assignee, deadline, and audit indexes
support the Stage 1 access patterns.

## RLS Summary

RLS is enabled on all tenant-sensitive tables. Policies require active
membership and apply organization roles. Executives are restricted to assigned
or permitted project data. Management roles remain organization-scoped.
Authenticated users cannot update or delete audit logs.

## Verification Results

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | 26 passed, 3 live integration tests skipped |
| `npm run build` | Passed |
| `npm audit --audit-level=high` | 0 vulnerabilities |
| Local `/login` HTTP smoke check | 200 response with SPA root |
| Client service-role reference scan | Passed |
| Static RLS/constraint/audit checks | Passed |
| Live migrations | Not run; credentials unavailable |
| Live login/recovery | Not run; credentials unavailable |
| Live organization A/B isolation | Not run; credentials unavailable |

The client build is approximately 1.11 MB before gzip and emits a chunk-size
warning. This is a performance issue, not a Stage 1 security blocker.

## Known Limitations

- External telephony, WhatsApp, n8n, AI, payment, and post-booking integrations
  remain out of scope and unavailable.
- The user-invitation flow is not a single transaction across Auth and
  PostgreSQL.
- Organization switching is supported by the API header but not by the UI.
- No backup restore drill, monitoring integration, alert routing, or production
  incident runbook has been validated.
- No load, browser E2E, accessibility, or disaster-recovery test has been run.
- Visual browser automation was unavailable in the local Windows sandbox; only
  the HTTP route smoke check was completed.

## User Setup Required

1. Create an isolated Supabase project.
2. Configure public and server-only environment values from `.env.example`.
3. Apply all migrations with `supabase db push`.
4. Run `npm run seed`.
5. Set `RUN_SUPABASE_INTEGRATION_TESTS=true` and run `npm test`.
6. Validate login, password recovery, owner, manager, and executive workflows.
7. Configure production Auth redirect URLs and allowed origins.
8. Configure backups, monitoring, log retention, and secret rotation ownership.

## Remaining Blockers

Pilot approval is blocked until:

- All migrations apply cleanly to the target PostgreSQL version.
- The three live tenant-isolation tests pass.
- Password recovery and invitation links are verified on the deployment URL.
- A backup and restore procedure is documented and tested.

## Rollback Plan

1. Stop application traffic or place the deployment in maintenance mode.
2. Roll back the application deployment to the previous immutable artifact.
3. Restore the pre-migration database backup if schema rollback is required.
4. Rotate the service-role key if exposure is suspected.
5. Preserve API and audit logs for investigation.

The migrations are forward-oriented. Do not attempt destructive down-migrations
on production data without a tested backup and a reviewed data-preservation
plan.
