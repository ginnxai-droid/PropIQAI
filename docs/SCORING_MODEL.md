# Stage 2 Deterministic Lead Scoring Model

Version: `stage-2-v1`

The API calculates every lead score. Clients cannot submit score, priority,
component values, scoring version, explanation, recalculation time, or SLA
deadline.

## Formula

Each component is normalized from 1 through 10:

| Component | Weight |
| --- | ---: |
| Budget fit | 30% |
| Purchase timeline | 25% |
| Buyer type and intent | 15% |
| Engagement quality | 15% |
| Source quality | 10% |
| Callback responsiveness | 5% |

The weighted total is clamped to 1 through 10 and rounded to one decimal.

## Component Rules

Budget fit compares the buyer range with the selected project:

- full overlap with buyer minimum inside the project range: 10
- partial overlap: 8
- buyer maximum within 10% below project minimum: 6
- buyer maximum within 25% below project minimum: 4
- missing or materially outside range: 1

Timeline: IMMEDIATE 10, WITHIN_3_MONTHS 9, THREE_TO_SIX_MONTHS 7,
SIX_TO_TWELVE_MONTHS 5, LONG_TERM 3, UNKNOWN 1.

Buyer intent starts at 7 for a defined buyer type, 5 for comparison shoppers,
and 2 for unknown. Site-visit interest adds 2. Booking or price-negotiation
intent adds 1. The result is capped at 10.

Engagement: HIGH 10, MEDIUM 7, LOW 4, UNKNOWN 1.

Source: PHONE/MISSED_CALL 9, WEBSITE/GOOGLE/PORTAL 8, EMAIL/MANUAL 6,
META/WHATSAPP 5. Source attribution does not claim an integration.

Responsiveness: RESPONSIVE 10, DELAYED 6, UNRESPONSIVE 2, UNKNOWN 1.

## Priority

- HOT: 8.0 through 10.0
- WARM: 6.0 through 7.9
- NURTURE: 4.0 through 5.9
- COLD: below 4.0

## Persisted Evidence

`leads.score_components` stores normalized values, weights, and contributions.
`score_explanation`, `scoring_version`, and `recalculated_at` make each result
auditable in the Lead Detail screen and persisted timeline.
