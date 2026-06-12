# Stage 3 Webhook Intake Security

Updated: June 12, 2026

## Endpoint

`POST /api/intake/webhook/:organizationSlug`

The organization slug is an identifier, not a credential. Every request also
requires `x-propiq-webhook-secret`.

## Controls

- The expected secret is server-only `INTAKE_WEBHOOK_SECRET`.
- Secret comparison uses SHA-256 digests and constant-time comparison.
- Missing configuration returns `INTEGRATION_NOT_AVAILABLE`.
- Missing or invalid secrets return a generic authentication failure.
- The body is limited by the global 256 kB JSON limit.
- Zod validates all normalized fields.
- Project and organization are resolved on the server.
- Duplicate checks remain inside the resolved organization.
- Raw payload storage redacts secret-, key-, token-, password-, cookie-, and
  authorization-like fields and bounds depth, arrays, keys, and strings.
- Service-role credentials are never returned to the browser.
- Rate limiting applies before webhook processing.

## Protected Intake

`POST /api/intake/website` and `POST /api/intake/manual` require an authenticated
OWNER, MANAGER, or ADMIN with `leads:create`. Their organization is taken from
the verified membership, never the request body.

## Unsupported Delivery

Outbound webhook callbacks, WhatsApp, telephony, email, SMS, and push delivery
are `Not available` in Stage 3.
