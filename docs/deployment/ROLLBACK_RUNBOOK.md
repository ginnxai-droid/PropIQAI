# Rollback And Demo Recovery Runbook

## When To Roll Back

Roll back when:

- the app does not load;
- login is broken;
- health/config exposes unsafe information;
- CORS blocks the hosted frontend;
- demo reset corrupts expected synthetic data;
- unavailable integrations are shown as available;
- stakeholders cannot complete the planned demo path.

## Rollback Deployment

1. Identify the last known-good commit.
2. Redeploy that commit through the hosting provider.
3. Re-enter or verify hosting environment variables.
4. Run the post-deployment smoke test.
5. Regenerate synthetic demo data if required.

## Recover If Seed Fails

1. Confirm the target is demo/staging only.
2. Confirm no real buyer data is present.
3. Check non-secret logs.
4. Rotate the seed password if there is any concern it was exposed.
5. Re-run `npm run seed`.
6. Re-run `PILOT_DATA_MODE=development npm run pilot-data`.

## Rotate Demo Passwords

1. Generate a new demo seed password in a password manager.
2. Store it in the hosting platform or ignored local environment file.
3. Re-run the seed command.
4. Verify Owner, Admin, Manager, and Executive login.
5. Do not document the password.

## Disable Demo Access

1. Disable or pause the hosting deployment.
2. Disable seeded demo users in Supabase if needed.
3. Rotate service-role, anon, webhook, and SMTP credentials if exposure is
   suspected.
4. Confirm the public app URL no longer loads.

## Check Logs Safely

- Search for error summaries, request IDs, and status codes.
- Do not copy full request bodies into tickets.
- Do not share authorization headers, cookies, URLs containing tokens, passwords,
  or provider credentials.

## Clean Test Artifacts

- Keep screenshots and Playwright output ignored unless explicitly approved.
- Remove temporary local logs after review.
- Do not commit backups or exported data.
