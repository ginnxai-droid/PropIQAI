# Stage 2 Handoff And SLA Rules

## Handoffs

The server creates an immediate handoff for:

- HOT score;
- site-visit request;
- price negotiation;
- booking or unit-block request;
- legal, RERA, payment, or possession commitment question;
- angry or confused buyer;
- human request;
- buyer budget at or above the project maximum;
- serious competitor comparison.

Signals are explicit validated qualification fields. The server does not infer
sensitive or commercial commitments from arbitrary conversation text.

An active `(organization, lead, reason)` pair is unique. Recalculation updates
the existing active handoff instead of duplicating it. A resolved reason may be
created again if it recurs.

Assignment uses the Stage 1 secure RPC. The assignee must be an active Manager
or Executive with an explicit assignment to the lead's project.

## SLA Deadlines

- explicit urgent HOT signal: 5 minutes
- score-only HOT: 10 minutes
- WARM: 17:00 Asia/Calcutta on the current business day, or next business day
  when created after 17:00
- NURTURE: 48 hours
- COLD: no urgent human SLA

Saturday and Sunday are skipped for WARM business-day deadlines.

## Breach And Escalation

Incomplete events are refreshed by the server:

- level 0: not overdue
- level 1: overdue under 15 minutes
- level 2: overdue 15 through 29 minutes
- level 3: overdue 30 through 59 minutes
- level 4: overdue 60 minutes or more

The level is persisted on `sla_events` and active `handoffs`. Managers and
owners see the organization/project-permitted queue. External notifications,
automatic reassignment, SMS, WhatsApp, and telephony are `Not available`.
