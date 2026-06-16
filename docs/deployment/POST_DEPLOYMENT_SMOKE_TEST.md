# Post-Deployment Smoke Test

## Purpose

Verify the hosted demo/staging environment after deployment or demo data reset.
This is demo-environment acceptance, not full product retesting.

## Optional Local Smoke Script

Dry-run the smoke checklist:

```powershell
npm run demo:smoke -- --dry-run
```

Run API checks against a hosted API:

```powershell
npm run demo:smoke -- --api-url <HTTPS_DEMO_API_URL>
```

Use placeholders in docs. Do not paste secrets into command examples.

## Required Manual Smoke Flow

1. App loads.
2. `GET /api/health` passes.
3. `GET /api/health/db` passes or reports explicit demo-safe degraded status.
4. `GET /api/health/config` hides secrets.
5. Login works.
6. Owner dashboard loads.
7. Manager queue loads.
8. Executive queue loads.
9. Pilot KPI Report loads.
10. Integration Status shows unavailable providers correctly.
11. Manual intake creates a fake lead.
12. Score appears.
13. Handoff/SLA appears.
14. Operational Queue opens Lead Detail.
15. No secrets appear in UI or API responses.

## Expected Integration Labels

The demo must show these as unavailable unless explicitly implemented in a
future authorized stage:

- WhatsApp
- Telephony
- Meta Lead Ads
- CRM sync

## Failure Handling

- If login fails, check Auth redirect URLs, seeded users, and password source.
- If API health fails, check API host, environment variables, and logs.
- If DB health fails, check server-side service-role configuration.
- If config health exposes values, stop the demo and fix before continuing.
- If unavailable integrations appear available, stop the demo and investigate.
