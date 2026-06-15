# Operational Queues

The Operational Queues page is backed by `GET /api/pilot/overview`.

## Queue Definitions

- HOT Lead Queue: active persisted HOT leads.
- SLA Breach Queue: active leads whose SLA deadline is past.
- Manager Escalation Queue: unresolved manager escalation alerts.
- Duplicate Review Queue: duplicate Stage 3 intake events.
- After-Hours Lead Queue: leads marked after hours.
- Site Visit Follow-Up Queue: completed or missed visits without completed
  post-visit feedback.
- AI Unavailable Review Queue: leads requiring manual qualification review.

Every row includes lead, status, owner or role, severity, creation time, due
time when available, and an Open Lead action. Severity filtering is client-side
over the already tenant-scoped response.

Executives receive rows only for leads assigned to their profile. Management
roles receive organization-scoped rows according to existing RLS and API
authorization.
