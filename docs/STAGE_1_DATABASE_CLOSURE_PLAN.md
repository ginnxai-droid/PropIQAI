# PropIQ AI Stage 1 Database Closure Plan

Updated: June 10, 2026

## Safety Gate

No destructive database command may run until all checks below pass:

1. `SOURCE_DB_URL` and `TARGET_DB_URL` are present in the current Codex process.
2. The complete values are compared in memory and are not identical.
3. Only non-secret host, database, and project-reference identifiers are
   written to evidence.
4. The target identifier is independently confirmed as the disposable Stage 1
   closure target.
5. The source is treated as read-only throughout the drill.

The June 11, 2026 run passed this gate using the ignored
`.env.database-closure.local` file. Source and target project references were
different, and Supabase project metadata identified the empty target as
`propiq-ai-stage1-restore-test`.

## Tooling

- Supabase CLI: `2.105.0` through `npx supabase`.
- PostgreSQL client: `psql 18.4`.
- PostgreSQL dump tool: `pg_dump 18.4`.
- Docker daemon: unavailable.

The PostgreSQL executables are installed at
`C:\Program Files\PostgreSQL\18\bin` but are not currently on `PATH`.

## Planned Commands

Connection strings must be supplied as process environment variables. Commands
must reference environment variables rather than embedding credentials in
tracked scripts or documentation.

### Safety and target inspection

```powershell
$source = [uri]$env:SOURCE_DB_URL
$target = [uri]$env:TARGET_DB_URL
# Compare complete values in memory; record only redacted host/database IDs.
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" `
  --dbname $env:TARGET_DB_URL `
  --set ON_ERROR_STOP=1 `
  --command "select current_database(), current_user;"
```

### Clean application-schema replay

After confirming that the target is disposable and has no important
application data, remove only application-owned `public` objects or recreate
the disposable target. Never run this against `SOURCE_DB_URL`.

Apply the six repository migrations in filename order:

```powershell
Get-ChildItem supabase/migrations/*.sql |
  Sort-Object Name |
  ForEach-Object {
    & "C:\Program Files\PostgreSQL\18\bin\psql.exe" `
      --dbname $env:TARGET_DB_URL `
      --set ON_ERROR_STOP=1 `
      --file $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($_.Name)" }
  }
```

Then point the application test environment at the target without changing
tracked files and run the seed twice and the live test matrix.

### Source backup

Backup location:

`backups/stage-1-closure/<timestamp>/`

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" `
  --dbname $env:SOURCE_DB_URL `
  --format custom `
  --schema public `
  --file (Join-Path $backupDir "propiq-stage-1-public.dump")
```

Record only filename, size, timestamp, checksum, exit code, and tool version.

### Restore

Use only `TARGET_DB_URL`. Reconfirm source/target inequality immediately before
restore. Restore only the application-owned `public` schema into the disposable
target and avoid Supabase-owned schemas and roles.

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" `
  --dbname $env:TARGET_DB_URL `
  --clean `
  --if-exists `
  --no-owner `
  --no-privileges `
  --schema public `
  --exit-on-error `
  (Join-Path $backupDir "propiq-stage-1-public.dump")
```

## Verification Procedure

1. Compare source and target counts for all 12 application tables.
2. Verify memberships, project assignments, lead/project relationships, and
   dependent workflow rows.
3. Verify expected enums, constraints, indexes, functions, triggers, and RLS
   policies.
4. Run the live tenant-isolation suite against the restored target.
5. Run the full test, E2E, type-check, build, audit, and secret-scan matrix.
6. Record zero skipped required tests before considering closure.

## Files Produced

- `backups/stage-1-closure/<timestamp>/propiq-stage-1-public.dump`
- non-sensitive command result logs outside source control, if needed;
- `docs/STAGE_1_FINAL_CLOSURE.md`.

Database backup artifacts are ignored by Git and must never be committed.

## Executed Closure Variation

Direct PostgreSQL authentication through the IPv4 pooler failed, while direct
database hosts required unavailable IPv6 connectivity. The source password was
not changed. The executed drill therefore used authenticated Supabase
Management API SQL access:

1. replay all six migrations on the empty target;
2. run the target seed twice through the target API;
3. export all 12 application-owned public tables;
4. encrypt the 126-row artifact with Windows DPAPI CurrentUser;
5. synchronize disposable-target development Auth identities by email;
6. restore public data in one transaction, remapping only project-specific
   `profiles.auth_user_id`;
7. reconcile counts, deterministic hashes, relationships, assignments, RLS,
   policies, triggers, and test-account login.

The resulting artifact and manifest are under
`backups/stage-1-closure/20260611-002505/`. Full results are recorded in
`docs/STAGE_1_FINAL_CLOSURE.md`.

## Rollback Strategy

- The source is never mutated and therefore requires no rollback.
- On migration or restore failure, discard or recreate the disposable target.
- Do not manually patch failed migrations.
- Retain the encrypted source backup until reconciliation and security checks
  pass, then archive or securely delete it according to the runbook.
