# Pilot Demo Script

## Owner

1. Sign in as the pilot owner.
2. Open Dashboard and review total, HOT, qualified, duplicate, after-hours,
   SLA, handoff, visit, source, team, and pilot health metrics.
3. Open Pilot Report and show persisted KPI distributions.
4. Point out Revenue Opportunity is `Not available`.
5. Open Integration Status and show available and unsupported providers.
6. Open Health Status and show safe API, database, and configuration checks.

## Manager

1. Sign in as the pilot manager.
2. Review team queue, overdue handoffs, SLA due soon and breached, executive
   workload, unassigned HOT leads, visit follow-ups, duplicate review, and
   escalations.
3. Open Operational Queues, apply a severity filter, and open a lead.
4. Review Internal Alerts and SLA Alerts.

## Executive

1. Sign in as the pilot executive.
2. Review assigned leads, HOT actions, today's follow-ups, pending visits, SLA
   countdowns, post-visit tasks, buyer intent, and next best actions.
3. Open Operational Queues and confirm only assigned work is visible.
4. Open a lead and continue the existing Stage 2/3 workflow.

## Fully Qualified Stage 3 Intake

1. Sign in as Admin and open Lead Inbox.
2. Select Add Lead.
3. Complete the visible Stage 3 Manual Intake fields, including source,
   channel, campaign, received time, location, message, budget, timeline, and
   qualification signals.
4. Select Create Lead. This uses `POST /api/intake/manual`, not legacy lead
   creation.
5. Open the new lead and review intake metadata, AI state, validated signals,
   duplicate state, after-hours state, timeline, and alerts.
