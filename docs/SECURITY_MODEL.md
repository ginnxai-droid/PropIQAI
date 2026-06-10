# Security Model

## Trust Boundaries

- Browser input and browser role claims are untrusted.
- Supabase Auth is the identity provider.
- Organization role and active state come from PostgreSQL memberships.
- The API provides validation and clear authorization failures.
- PostgreSQL RLS is the final tenant-isolation boundary.
- The service-role key is trusted server-only material.

## Roles

| Capability | OWNER | ADMIN | MANAGER | EXECUTIVE |
| --- | --- | --- | --- | --- |
| Read permitted projects and leads | Yes | Yes | Yes | Assigned/permitted only |
| Create leads | Yes | Yes | Yes | No |
| Assign leads | Yes | Yes | Yes | No |
| Manage projects | Yes | Yes | No | No |
| Manage members | Yes | Yes, except OWNER/ADMIN grants | No | No |
| Read reports and SLA views | Yes | Yes | Yes | No |
| Update assigned tasks and visits | Yes | Yes | Yes | Yes |

`ADMIN` is organization-scoped and has no platform-wide or cross-organization
bypass.

## Tenant Isolation

- Every tenant-sensitive query and write carries `organization_id`.
- Composite foreign keys prevent a tenant record from referencing another
  tenant's project or lead.
- Composite membership foreign keys prevent cross-tenant assignees and project
  access records.
- RLS checks active membership and, for executives, project or lead access.
- A membership trigger blocks direct ADMIN-to-OWNER/ADMIN escalation,
  self-disablement, and removal of the last active owner.
- The API validates task and site-visit assignees against active membership.
- Seed data creates a second organization specifically for isolation testing.

## Authentication

- Password sessions and recovery use Supabase Auth.
- Protected API routes require a valid bearer token.
- Disabled profiles and inactive memberships are denied.
- Password-reset redirects must be allowlisted in Supabase.
- The application does not store passwords or implement custom tokens.

## Application Security Controls

- Strict Zod validation for server mutations.
- Helmet security headers and disabled `X-Powered-By`.
- Explicit CORS allowlist.
- 256 KB JSON body limit.
- API rate limiting.
- Sanitized client errors and generic unexpected server errors.
- Append-only audit logs for authenticated application users.
- No service-role key references in browser source.

## Audit Events

Audited operations include:

- Lead creation, assignment, status, score, and updates.
- Conversation creation.
- Project creation and updates.
- Site-visit creation and updates.
- Follow-up task creation and updates.
- User invitation, role changes, and disablement.

## Secrets

Public:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY`
- Future integration secrets such as `N8N_WEBHOOK_SECRET`

Local environment files are ignored. Secret rotation is required if a real key
is ever committed or exposed in logs.

## Known Security Limitations

- Live RLS behavior must be verified against the target Supabase project before
  pilot approval.
- User invitation spans Supabase Auth and database writes; a failure after the
  Auth invitation can require operator cleanup.
- Stage 1 selects the first active membership unless the caller supplies
  `X-Organization-Id`; the UI does not yet expose organization switching.
- Audit logs are application records, not a replacement for provider audit
  logs, backups, or SIEM retention.
