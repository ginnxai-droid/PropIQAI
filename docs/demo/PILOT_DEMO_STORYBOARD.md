# PropIQ AI Pilot Demo Storyboard

## Screenshot Evidence Boundary

Existing deep E2E evidence screenshots are stored locally in:

`test-results/deep-e2e-evidence/`

These files are ignored test artifacts. Do not move or commit the screenshots
unless explicitly authorized. This storyboard references their local path and
demo purpose only.

## Storyboard

| Step | Screenshot | Purpose | Talk Track |
| --- | --- | --- | --- |
| 1 | `test-results/deep-e2e-evidence/01-owner-dashboard.png` | Owner dashboard | Show pilot health, lead volume, HOT leads, qualification, duplicates, after-hours leads, SLA, handoff, visits, source, and team metrics. |
| 2 | `test-results/deep-e2e-evidence/02-operational-queues-critical-filter.png` | Critical operational queues | Show the sales head how urgent work is prioritized through queues instead of hidden in inboxes. |
| 3 | `test-results/deep-e2e-evidence/03-pilot-kpi-report.png` | Pilot KPI report | Show persisted KPI reporting and explain that unsupported revenue opportunity is not fabricated. |
| 4 | `test-results/deep-e2e-evidence/04-health-status.png` | Health status | Show API, database, and configuration readiness without exposing secrets. |
| 5 | `test-results/deep-e2e-evidence/05-integration-readiness.png` | Integration readiness | Show available intake channels and unavailable external providers. |
| 6 | `test-results/deep-e2e-evidence/06-admin-stage3-intake.png` | Stage 3 intake | Show how admin/manual intake captures business context and feeds the disciplined workflow. |
| 7 | `test-results/deep-e2e-evidence/07-manager-dashboard.png` | Manager dashboard | Show workload, escalation, SLA, duplicate review, follow-up, and operational accountability. |
| 8 | `test-results/deep-e2e-evidence/08-executive-dashboard.png` | Executive dashboard | Show assigned action queue, next actions, visits, follow-up tasks, and buyer intent context. |

## Suggested Demo Sequence

1. Start with `01-owner-dashboard.png` to frame owner value.
2. Move to `06-admin-stage3-intake.png` to show how lead context enters the
   system.
3. Show `02-operational-queues-critical-filter.png` to explain daily discipline.
4. Show `07-manager-dashboard.png` for management accountability.
5. Show `08-executive-dashboard.png` for sales executive clarity.
6. Show `03-pilot-kpi-report.png` for stakeholder reporting.
7. Show `05-integration-readiness.png` and `04-health-status.png` to close with
   readiness and limitations.
