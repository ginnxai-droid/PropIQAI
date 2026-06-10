# PropIQ AI Backup And Restore

## Purpose

This procedure validates recoverability using an isolated source project and a
separate disposable target project. Never run the restore steps against
production.

Supabase's current CLI guidance requires the Supabase CLI, Docker Desktop, a
PostgreSQL `psql` client, and database connection strings for both projects:

- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/reference/cli/supabase-db-dump

## Required Permissions And Tools

- Supabase project administrator access to the isolated source and target.
- Source and target database passwords.
- Session-pooler or direct PostgreSQL connection strings.
- Supabase CLI.
- Docker Desktop or another Docker daemon used by `supabase db dump`.
- A compatible PostgreSQL `psql` client.
- An encrypted local directory outside the repository for backup artifacts.

Store connection strings in process environment variables or a secure password
manager. Do not paste them into tracked scripts, reports, command output, or
shell history.

## Backup Process

In PowerShell, set the connection string only for the current process:

```powershell
$env:SOURCE_DB_URL = Read-Host "Source database connection string"
$backupDir = Join-Path $env:TEMP ("propiq-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $backupDir | Out-Null
```

Create role, schema, and data dumps:

```powershell
supabase db dump --db-url $env:SOURCE_DB_URL --file (Join-Path $backupDir "roles.sql") --role-only
supabase db dump --db-url $env:SOURCE_DB_URL --file (Join-Path $backupDir "schema.sql")
supabase db dump --db-url $env:SOURCE_DB_URL --file (Join-Path $backupDir "data.sql") --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

Record only the command exit status, timestamp, CLI version, PostgreSQL version,
and encrypted artifact checksums. Do not commit the dumps because they contain
PII and application data.

## Restore Process

1. Create a new disposable Supabase project in the same or a compatible
   PostgreSQL major version.
2. Obtain its Session Pooler connection string from the Connect panel.
3. Confirm the target contains no required data.
4. Set the target connection string for the current process:

   ```powershell
   $env:TARGET_DB_URL = Read-Host "Disposable target database connection string"
   ```

5. Restore all files in one transaction and stop on the first SQL error:

   ```powershell
   psql `
     --single-transaction `
     --variable ON_ERROR_STOP=1 `
     --file (Join-Path $backupDir "roles.sql") `
     --file (Join-Path $backupDir "schema.sql") `
     --command "SET session_replication_role = replica" `
     --file (Join-Path $backupDir "data.sql") `
     --dbname $env:TARGET_DB_URL
   ```

6. Re-enable any project configuration not contained in the logical database
   dump, then rotate the disposable target's credentials after the exercise.

If restoring a schema-only dump separately, review Supabase's default privilege
warning before restoring:

```sql
ALTER DEFAULT PRIVILEGES IN SCHEMA public
REVOKE ALL ON TABLES FROM anon, authenticated;
```

Do not edit dump files merely to hide an unexplained restore failure. The only
documented exceptions are platform-owned role statements identified by the
Supabase restore guide; any such exception must be recorded with its exact
error and reviewed.

## Recovery Verification Checklist

Run these checks on the disposable target:

- [ ] `organizations` row count and organization slugs match the source.
- [ ] `profiles` and `organization_members` retain valid relationships.
- [ ] `organization_member_projects` links memberships to the expected projects.
- [ ] `projects` and `leads` counts match by organization.
- [ ] `conversations`, `handoffs`, `site_visits`, `followup_tasks`, and
      `sla_events` counts match by organization and lead.
- [ ] `audit_logs` count and sampled actions match.
- [ ] All six repository migrations are represented or the restored schema is
      proven equivalent.
- [ ] RLS is enabled on every tenant-sensitive table.
- [ ] Expected policies, functions, triggers, constraints, and indexes exist.
- [ ] Organization A cannot read or mutate Organization B data.
- [ ] EXECUTIVE access remains limited to assigned or permitted projects.
- [ ] Ordinary authenticated users cannot update or delete audit logs.
- [ ] The application can load persisted records after API restart.

Example count query:

```sql
select 'organizations' as table_name, count(*) from public.organizations
union all select 'memberships', count(*) from public.organization_members
union all select 'projects', count(*) from public.projects
union all select 'leads', count(*) from public.leads
union all select 'conversations', count(*) from public.conversations
union all select 'handoffs', count(*) from public.handoffs
union all select 'site_visits', count(*) from public.site_visits
union all select 'followup_tasks', count(*) from public.followup_tasks
union all select 'sla_events', count(*) from public.sla_events
union all select 'audit_logs', count(*) from public.audit_logs;
```

## Expected Recovery Limitations

- Logical database dumps do not restore deleted Storage objects; database
  backups contain Storage metadata, not object contents.
- Passwords for custom PostgreSQL login roles are not preserved.
- Project-level Auth settings, redirect URLs, SMTP configuration, API keys,
  secrets, network restrictions, and dashboard configuration require separate
  inventory and reconfiguration.
- Storage objects and Edge Functions require separate backup and deployment
  procedures if they are introduced later.
- Recovery point objective is bounded by backup frequency. Daily backups may
  lose up to one day of changes; PITR is required for finer recovery.
- Restore duration grows with database size and requires application downtime.

## Ownership And Frequency

- Product owner: approves recovery objectives and accepts residual data-loss
  risk.
- Database owner: confirms automated backups, retention, encryption, and
  restore permissions.
- Engineering owner: maintains migrations, verification queries, and the
  application smoke test.
- Security owner: reviews access to dumps and confirms secure deletion.

For a pilot, take an encrypted logical backup before every schema deployment and
at least daily while active data changes. Run a disposable restore drill before
pilot approval and at least quarterly thereafter. Record duration, failures,
row-count evidence, and corrective actions without storing secrets or PII in
the report.

## Destructive-Operation Warning

Never test restoration, `supabase db reset --linked`, schema drops, or data
replacement against a production project. A restore drill must target a new,
disposable environment with its identity and connection string independently
verified immediately before execution.

## Stage 1B Drill Status

Last checked: June 11, 2026.

- Source and target were confirmed as different Supabase projects.
- The target was independently identified as
  `propiq-ai-stage1-restore-test` and contained zero public base tables.
- All six migrations replayed successfully.
- The target seed passed twice.
- Direct `pg_dump` was unavailable because the supplied database password did
  not authenticate through the IPv4 pooler and direct hosts required IPv6.
- The source password was not changed.
- An authenticated Management API export captured all 12 application-owned
  public tables and 126 rows.
- The artifact was encrypted with Windows DPAPI CurrentUser and stored under
  ignored `backups/stage-1-closure/20260611-002505/`.
- The backup restored into the disposable target in one transaction.
- Counts and deterministic content hashes matched for all 12 tables after
  restore, excluding only the target-specific Auth UUID in
  `profiles.auth_user_id`.
- Restored-target security tests passed 54 of 54 with zero skips.
- Restored-target Playwright tests passed 4 of 4 with zero skips.

The Stage 1 application-data backup and restore drill is verified. This drill
does not claim to back up Supabase-owned Auth configuration, Storage objects,
SMTP settings, redirect URLs, API keys, or secrets.
