# Pilot KPI Reporting

## Data Contract

`GET /api/pilot/overview` calculates pilot metrics from tenant-scoped persisted
records. The client does not invent lead, SLA, visit, handoff, alert, AI, or
integration totals.

## Metrics

- Lead volume by source: count of persisted leads grouped by `source`.
- Priority distribution: persisted `HOT`, `WARM`, `NURTURE`, and `COLD` leads.
- SLA compliance: completed-on-time SLA events divided by measurable SLA
  events. It is `Not available` when no SLA event is measurable.
- Average response delay: mean time from lead creation to `first_response_at`.
- Duplicate and after-hours totals: Stage 3 intake and lead flags.
- Site visit funnel: visits grouped by persisted status.
- Handoff effectiveness: resolved handoffs divided by all handoffs.
- Workload: assigned leads and pending tasks grouped by organization member.
- AI coverage: completed and `NOT_AVAILABLE` qualification states.
- Integration failures: persisted failed integration events.

Revenue opportunity remains `Not available`; the product has no defensible
persisted revenue formula.

## Export Readiness

The Pilot Report page uses labeled semantic sections and can compile a
plain-text controlled summary. Paid PDF or external export services are outside
Stage 4.
