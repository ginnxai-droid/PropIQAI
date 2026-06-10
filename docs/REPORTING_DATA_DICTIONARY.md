# Reporting Data Dictionary

All Stage 1 metrics are calculated from persisted, tenant-scoped Supabase rows. The API derives the active `organization_id` from the authenticated membership; clients cannot supply a role or organization for metric calculation.

| Metric | Source | Definition and formula | Current limitation |
| --- | --- | --- | --- |
| Total leads | `leads` | Count of all visible rows for the active organization. | No date-range filter in Stage 1. |
| New leads | `leads.status` | Count where status is `NEW`. | Reflects current status, not historical arrivals. |
| Qualified leads | `leads.status` | Count where status is `QUALIFIED`. | Booked or visited leads are not also counted as qualified. |
| Hot leads | `leads.priority` | Count where priority is `HOT`. | Priority is the current persisted classification. |
| After-hours leads | `leads.is_after_hours` | Count where the persisted flag is true. | The ingestion source is responsible for setting the flag. |
| Missed calls responded | `leads.source`, `leads.first_response_at` | Count where source is `MISSED_CALL` and a first response timestamp exists. | This proves response recording, not telephony recovery delivery. |
| Average first response | `leads.created_at`, `leads.first_response_at` | Mean of `max(0, first_response_at - created_at)` for leads with a first response, rounded to seconds. | Leads without a response are excluded. |
| Confirmed site visits | `site_visits.status` | Count where status is exactly `CONFIRMED`. | This is the primary dashboard visit metric. It does not include requested, tentative, missed, rescheduled, completed, or cancelled records. |
| Completed site visits | `site_visits.status` | Count where status is exactly `COMPLETED`. | This is a completed-event count, not a current confirmed-booking count. |
| Active visit records | `site_visits.status` | Count where status is not `CANCELLED`. | This operational inventory includes requested, tentative, confirmed, completed, missed, and rescheduled records and must not be described as bookings. |
| SLA breaches | `sla_events.breached`, `sla_events.due_at`, `sla_events.completed_at` | Count where `breached` is true, or the event is incomplete and its due time is in the past. | Evaluated at request time; no historical snapshot. |
| Source distribution | `leads.source` | Count of leads grouped by every persisted source enum value. | No attribution weighting or multi-touch attribution. |
| Revenue opportunity | None | Returns `null`. | Stage 1 has no defensible booking value or revenue model. |

`tests/site-visit-metrics.test.ts` proves the formulas across every visit status.
`tests/reporting-reconciliation.integration.test.ts` compares the dashboard API
response with direct service-role queries constrained to the same organization.
The live reconciliation runs when `RUN_SUPABASE_INTEGRATION_TESTS=true`.
