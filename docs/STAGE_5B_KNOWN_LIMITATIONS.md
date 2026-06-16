# Stage 5B Known Limitations

Updated: June 17, 2026

## Product Boundary

PropIQ AI is accepted for secure pilot-demo preparation only. It is not
accepted for production deployment.

Stage 5B is limited to pilot demo execution and demo rehearsal readiness.

## Known Limitations

- Not production deployed.
- Fake data only.
- No live integrations.
- No WhatsApp.
- No telephony.
- No CRM sync.
- No payments.
- No inventory.
- No channel partner portal.
- No AI voice.
- No real customer onboarding.
- No production credentials.
- No production external AI autonomy.
- No live buyer data import.
- No public launch.
- No paid integrations.
- Revenue opportunity remains `Not available`.
- Paid PDF export remains `Not available`.

## Technical / Demo Limitations From Existing Docs

- Demo and reset flows depend on seeded users and synthetic pilot data.
- Demo data reset must use `PILOT_DATA_MODE=development`.
- The demo reset flow must not run against production mode.
- Health/config checks expose readiness booleans, not secret values.
- Demo environment setup is provider-neutral; a specific host is not assumed.
- Hosted API smoke checks require a configured demo API URL.
- Email invitation and password reset readiness depend on the selected Auth or
  SMTP provider configuration.
- Deep E2E screenshots are local ignored evidence, not committed product
  artifacts.
- External provider readiness is shown as availability status only; unavailable
  providers must not be presented as connected.

## How To Explain Limitations

Use direct language:

"This is intentionally not available in the pilot-demo scope. We are validating
lead discipline, SLA visibility, role dashboards, queues, and KPI trust before
investing in external integrations or production deployment."

## What Must Not Be Claimed

Do not claim:

- production deployment is complete;
- real customer onboarding has started;
- WhatsApp or telephony is connected;
- CRM sync is available;
- production AI provider autonomy is enabled;
- revenue opportunity is calculated;
- paid PDF export exists;
- real buyer data has been imported.
