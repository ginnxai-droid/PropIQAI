# Stage 3 Internal Alert Rules

Updated: June 12, 2026

Alerts are persisted in `internal_alerts`. They are internal workflow records,
not proof of email, SMS, WhatsApp, push, or telephony delivery.

| Alert | Trigger | Default severity |
| --- | --- | --- |
| `HOT_LEAD` | External intake receives deterministic HOT priority | High |
| `PRIORITY_HOT_LEAD` | External intake score is at least 9.0 | Critical |
| `SLA_DUE_SOON` | Incomplete SLA is due within five minutes | Warning |
| `SLA_BREACHED` | Incomplete SLA passes its deadline | High or Critical |
| `MANAGER_ESCALATION` | SLA escalation reaches level 2 or higher | High or Critical |
| `AFTER_HOURS_HIGH_INTENT` | HOT intake arrives outside India business hours | Critical |
| `DUPLICATE_LEAD_DETECTED` | Tenant-scoped phone or email duplicate is found | Warning |
| `ASSIGNMENT_REQUIRED` | No active project executive can be selected | High |

Only one active alert of a given type is retained per lead. Authorized managers
can move an alert from `OPEN` to `ACKNOWLEDGED` and then `RESOLVED`. Each change
is audit logged.

Executives may read alerts only for leads already accessible through Stage 1
lead access rules. Alert lifecycle updates require OWNER, MANAGER, or ADMIN.
