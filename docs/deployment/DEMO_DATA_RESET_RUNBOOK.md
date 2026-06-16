# Demo Data Reset Runbook

## Purpose

Reset and regenerate synthetic pilot data for a safe hosted demo/staging
environment.

## Safety Boundary

- Use fake data only.
- Do not run against real buyer data.
- Do not run against production mode.
- Do not remove non-demo records.
- Use only the guarded demo namespace.

## Required Mode

The pilot data command requires:

```powershell
$env:PILOT_DATA_MODE = "development"
```

The guard rejects production mode and rejects runs without
`PILOT_DATA_MODE=development`.

## Reset And Regenerate

```powershell
Set-Location "D:\AI Project\Codex Project\PropIQ AI"
$env:PILOT_DATA_MODE = "development"
npm run seed
npm run pilot-data
```

Run the same sequence again to verify repeatability:

```powershell
$env:PILOT_DATA_MODE = "development"
npm run seed
npm run pilot-data
```

## Reset Only

```powershell
$env:PILOT_DATA_MODE = "development"
npm run pilot-data:reset
```

## Expected Synthetic Data

The reset/generation flow should prepare:

- Owner/Admin/Manager/Executive seeded users;
- fake leads;
- duplicate intake;
- after-hours case;
- alerts;
- site visits;
- SLA breach;
- AI-unavailable case;
- failed retry-ready integration event.

## If Seed Fails

1. Stop the demo.
2. Confirm the target Supabase project is demo/staging only.
3. Confirm all required environment variables are present.
4. Confirm Auth user creation is allowed.
5. Re-run `npm run seed`.
6. If it still fails, do not patch data manually; capture the non-secret error
   summary and investigate before continuing.

## Confirm No Real Customer Data

Before demo:

- verify pilot records use fake names and `.test` style emails;
- verify no imported buyer lists are present;
- verify the target project is the demo/staging project;
- verify screenshots and exports contain only fake data.
