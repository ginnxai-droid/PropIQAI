# PropIQ AI Stage 1 Final Closure

Updated: June 11, 2026

## Final Verdict

**STAGE 1 CLOSED**

Stage 2 was not started as part of this closure run.

## Safety Gate

- Secret source: ignored `.env.database-closure.local`.
- Source project: `efwkfwkhptadqatwfost` (`propiq-ai-stage1-test`).
- Target project: `qdxahdqgtgouumpgiqyq`
  (`propiq-ai-stage1-restore-test`).
- Complete source and target connection values were different.
- Supabase project metadata independently confirmed that the project references
  were different and that the target was the dedicated restore-test project.
- The target was healthy and contained zero public base tables before replay.
- No destructive command was executed against the source.
- No database URL, password, API key, or service-role key was printed or added
  to source control.

## Database Closure Results

| Requirement | Result |
| --- | --- |
| Clean target before replay | 0 public base tables |
| Migration replay | 6 of 6 migrations passed |
| Migration history | 6 expected versions recorded |
| RLS after replay | 12 of 12 application tables enabled |
| RLS policies | 30 |
| Target seed run 1 | Passed |
| Target seed run 2 | Passed |
| Source application backup | Passed |
| Restore into disposable target | Passed |
| Source/target reconciliation | 12 of 12 tables matched |
| Restored tenant-isolation suite | 54 of 54 passed, 0 skipped |
| Restored Playwright suite | 4 of 4 passed, 0 skipped |

## Backup Evidence

The direct PostgreSQL credentials supplied in the closure file did not
authenticate through the IPv4 pooler, and this network has no usable IPv6 path
to the direct database hosts. The source password was not rotated or changed.

The closure therefore used the authenticated Supabase Management API to create
an application-owned logical backup of all 12 public tables. The backup was
encrypted immediately with Windows DPAPI for the current user.

- Directory: `backups/stage-1-closure/20260611-002505/`
- Artifact: `propiq-stage-1-public.json.dpapi`
- Encryption: Windows DPAPI CurrentUser
- Size: 92,406 bytes
- SHA-256:
  `BA8E8CA5D0CEB32EC8A2A101D984E17AB97C246A4DF7BDB42BEABF17AF280F00`
- Tables: 12
- Rows: 126
- Manifest: `manifest.json`

The backup directory and closure environment file are ignored by Git. No
backup artifact or credential is tracked.

## Restore And Reconciliation

The six migrations were replayed on the empty target before data restoration.
Target development Auth users were synchronized by email and confirmed. The
public backup was restored in a single transaction.

`profiles.auth_user_id` was remapped to the corresponding target Auth identity
because Auth user UUIDs are project-specific and the application backup does
not copy Supabase-owned Auth tables. All other public values and identifiers
were restored exactly.

Final reconciliation:

- all 12 table row counts matched;
- all 12 deterministic content hashes matched;
- the profile hash intentionally excluded only `auth_user_id`;
- 126 total public rows matched;
- 0 orphaned relationships;
- 0 duplicate member-project assignments;
- 0 disabled application/Auth user triggers;
- all 6 target accounts authenticated successfully and were email-confirmed.

## Security And Application Verification

- Full unit/API/security/live Supabase suite:
  `54 passed, 0 failed, 0 skipped`.
- Playwright browser suite: `4 passed, 0 failed, 0 skipped`.
- Lint: passed.
- Type-check: passed.
- Production client/server build: passed.
- Dependency audit: 0 vulnerabilities.
- Tracked-file secret scan: no database URL, password, service-role key, or
  other sensitive configured value found.
- Manual invitation, recovery, Executive authorization, cross-tenant denial,
  and logout-route evidence remains recorded separately from automated tests.

The first restored-target Playwright attempt used `127.0.0.1` while the API
allowed only `localhost`, so the persistence request was rejected by CORS.
The servers were restarted with the exact Playwright origin in
`ALLOWED_ORIGINS`; all four unchanged tests then passed.

## Remaining P1 Issue

- The main client chunk remains above Vite's 500 kB warning threshold
  (610.71 kB, 182.63 kB gzip).

This is a performance follow-up, not a Stage 1 security or recoverability
blocker.

## Closure Decision

Clean migration replay, idempotent target seeding, encrypted application
backup, disposable-target restore, row reconciliation, restored tenant
isolation, browser verification, build verification, dependency audit, and
secret scanning are complete.

There are no remaining P0 Stage 1 blockers. Stage 1 is closed. Stage 2 remains
outside the scope of this run and was not started.
