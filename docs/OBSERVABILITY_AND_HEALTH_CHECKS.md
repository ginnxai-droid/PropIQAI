# Observability And Health Checks

## Endpoints

- `GET /api/health`: process availability and timestamp.
- `GET /api/health/db`: Supabase connectivity as `reachable` or
  `Not available`.
- `GET /api/health/config`: environment mode and boolean configuration
  presence checks.

Health responses never return keys, passwords, database URLs, webhook secrets,
or stack traces.

## Request And Error Logging

The API accepts or generates `X-Request-Id`, returns it on the response, and
includes it in safe error envelopes. Request completion, startup, and error
logs are structured JSON. Bodies, authorization headers, secret values, and
stack traces are excluded.

Pilot health is `ATTENTION` when persisted SLA breaches, unresolved alerts, or
integration failures exist; otherwise it is `HEALTHY`.
