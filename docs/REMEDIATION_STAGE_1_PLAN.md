# PropIQ AI Stage 1 Remediation Plan

## Current Architecture Summary

- Frontend: React 19 single-page application.
- Build system: Vite 6 with TypeScript 5.8 and Tailwind CSS 4.
- Package manager: npm with `package-lock.json`.
- State management: one React context containing all business records and mutators.
- Navigation: string-based client state; there is no router or protected route layer.
- Deployment configuration: none in the repository.
- Backend: none.
- Database: none.
- Authentication: none.

## Current Application State

The repository is a polished demonstration UI. All projects, users, leads,
conversations, handoffs, site visits, and tasks are loaded from
`src/sampleData.ts`. Mutations only modify React memory and are lost on refresh.

The current checks before remediation are:

- `npm run lint`: passed (`tsc --noEmit` only).
- `npm run build`: passed.
- Build warning: the main JavaScript bundle is approximately 883 KB.
- Tests: no test runner, test files, or test command exist.
- Dependency audit: no known npm advisories at the time of inspection.

## Current Data-Storage Method

There is no durable storage. `src/context/AppContext.tsx` initializes arrays
from static sample data and mutates them with React state setters. Site-visit
notes also directly mutate an object held in state.

There is no schema, migration, transaction, uniqueness constraint, foreign-key
constraint, backup strategy, tenant key, or audit history.

## Current Authentication State

The header exposes a role selector that changes `activeRole` locally. This is a
persona switcher, not authentication. There are no sessions, credentials,
protected routes, user profiles, disabled-user checks, or server-side
authorization controls.

## Current Security Risks

- All application screens and data are public to anyone who can load the SPA.
- Users can select any role, including OWNER and ADMIN.
- No tenant boundary exists.
- Browser input is trusted and inserted into state with minimal validation.
- The mock webhook claims database deduplication and secure API behavior that
  does not exist.
- IDs are generated from array lengths and can collide.
- PII is stored in the client bundle as sample data.
- No audit trail exists.
- No Content Security Policy or API security middleware exists.
- No server-side error sanitization exists.
- There are no automated authorization or tenant-isolation tests.

## Mock-Only Features

- Lead intake webhook and console output.
- Database duplicate check.
- Role switching and user identity.
- SLA notifications and escalation delivery.
- WhatsApp confirmations and reminders.
- Dashboard response-speed and recovery claims.
- Pilot performance and revenue report claims.
- Project, user, lead, conversation, assignment, visit, and task persistence.

## Broken or Misleading Features

- Refresh removes all changes.
- Reassigning a lead creates duplicate handoffs and callback tasks.
- Assigning a lead marks it contacted without a real contact event.
- Site-visit notes directly mutate React state.
- Malformed webhook values can reach rendering code and cause runtime errors.
- Role and project eligibility are not enforced during assignment.
- Report metrics are hardcoded or inferred from mock records.
- The UI advertises an exposed API endpoint that is not implemented.

## Proposed Stage 1 Architecture

### Frontend

- Retain React, Vite, Tailwind, and the existing visual design.
- Add React Router for `/login`, `/reset-password`, protected application
  routes, permission-denied, and not-found states.
- Add a Supabase browser client using only the public URL and anonymous key.
- Replace the role selector with an authenticated profile and organization
  membership display.
- Replace in-memory core mutations with calls to the authenticated API.
- Keep development seed data out of the production client bundle.

### API

- Add an Express server under `server/`.
- Browser requests send the Supabase access token as a bearer token.
- The API verifies the token with Supabase Auth, loads the active profile and
  organization membership, checks role permissions, validates input with Zod,
  and performs database operations.
- Database requests use a Supabase client scoped to the user's JWT so Row-Level
  Security remains authoritative.
- The service-role client is server-only and reserved for operations that
  require privileged administration. It is never imported into browser code.
- API errors are sanitized and unexpected errors are logged server-side.
- Helmet, explicit CORS, JSON body limits, and rate limiting protect the API.

### Database

- Supabase PostgreSQL migrations live in `supabase/migrations/`.
- All tenant-sensitive records contain `organization_id`.
- Row-Level Security is enabled for every tenant-sensitive table.
- Policies use active organization membership and role-aware helper functions.
- Foreign keys, checks, indexes, unique constraints, and timestamp triggers
  enforce data integrity.
- Audit rows are append-only to normal authenticated users.

## Exact Files to Create

- `server/app.ts`
- `server/index.ts`
- `server/config.ts`
- `server/auth.ts`
- `server/authorization.ts`
- `server/errors.ts`
- `server/supabase.ts`
- `server/validation.ts`
- `server/routes/projects.ts`
- `server/routes/leads.ts`
- `server/routes/siteVisits.ts`
- `server/routes/dashboard.ts`
- `server/routes/organization.ts`
- `src/lib/supabase.ts`
- `src/lib/api.ts`
- `src/context/AuthContext.tsx`
- `src/components/LoginView.tsx`
- `src/components/ResetPasswordView.tsx`
- `src/components/PermissionDeniedView.tsx`
- `src/components/NotFoundView.tsx`
- `src/components/AppErrorBoundary.tsx`
- `supabase/config.toml`
- `supabase/migrations/202606090001_stage_1_schema.sql`
- `supabase/migrations/202606090002_stage_1_rls.sql`
- `supabase/seed.sql`
- `tests/server/validation.test.ts`
- `tests/server/authorization.test.ts`
- `tests/security/schema.test.ts`
- `tests/security/client-bundle.test.ts`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY_MODEL.md`
- `docs/REMEDIATION_STAGE_1_REPORT.md`

Some route modules may be consolidated if doing so produces a clearer, smaller
security boundary without changing functionality.

## Exact Files to Modify

- `.env.example`
- `.gitignore`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vite.config.ts`
- `README.md`
- `src/main.tsx`
- `src/App.tsx`
- `src/context/AppContext.tsx`
- `src/components/Header.tsx`
- `src/components/Sidebar.tsx`
- Existing views that currently perform in-memory mutations or display
  fabricated metrics.

## Database Migration Plan

1. Enable required PostgreSQL extensions.
2. Create role/status enum types.
3. Create organizations, profiles, and organization memberships.
4. Create projects, leads, conversations, handoffs, site visits, follow-up
   tasks, SLA events, and audit logs.
5. Add tenant-safe composite constraints and foreign keys.
6. Add check constraints for scores, budgets, dates, and allowed values.
7. Add indexes for tenant, project, assignee, status, priority, deadlines,
   contact fields, and creation timestamps.
8. Add updated-at triggers.
9. Add auth/profile synchronization helpers.
10. Enable RLS and add membership/role-aware policies.
11. Add append-only audit protections.
12. Provide development seed records for two organizations.

## Authorization Model

ADMIN is an organization administrator in Stage 1. It does not bypass tenant
isolation.

- OWNER: organization-wide business data, project management, membership
  management, reports, SLA review, and reassignment.
- MANAGER: organization/project-scoped operations, assignment, SLA, visits,
  and reports; cannot transfer ownership or grant OWNER/ADMIN.
- EXECUTIVE: assigned/permitted leads, conversations, tasks, and visits only;
  cannot manage users or roles.
- ADMIN: organization administration and organization-wide access, but no
  cross-organization or platform-level bypass.

The API repeats critical authorization checks for clear failures, while RLS is
the final data-isolation boundary.

## Testing Plan

- Unit-test Zod schemas for email, phone, score, budget, project, organization,
  role, status, and date validation.
- Unit-test role permission decisions.
- Static security tests verify RLS is enabled, tenant policies exist, audit
  mutation is restricted, and the service-role key is absent from browser code.
- API tests use dependency injection/mocks for unauthenticated and unauthorized
  request behavior.
- Supabase integration tests are documented and enabled when local Supabase or
  test-project credentials are available.
- Build output is scanned to ensure the service-role key name/value is not
  emitted.
- Run lint, typecheck, tests, production build, and npm audit.

## Assumptions

- A Supabase project will be provided for the controlled pilot.
- The existing Vite UI must remain recognizable and no product redesign is
  desired.
- One active organization membership is selected for Stage 1. The schema
  supports multiple memberships; organization switching can be added later.
- ADMIN means organization administrator.
- External WhatsApp, telephony, AI, n8n, payments, and post-booking workflows
  remain explicitly out of scope.
- Development seed auth users require local Supabase setup or a separate
  administrative seed command because SQL alone cannot safely set production
  passwords.

## Decisions Requiring User Approval

No blocking code decision is required. The recommended Vite + Express +
Supabase architecture is being used.

Before live end-to-end verification, the user must provide or configure:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` on the server only
- A local Supabase instance or isolated test Supabase project

Real secrets must be placed in an ignored local environment file and must not
be sent through source control.
