# Demo Access Checklist

## Credential Rule

Do not write passwords in this document. Use the seeded test password from the
local ignored environment file or the hosting provider secret store.

## Account Checklist

| Role | Required Check |
| --- | --- |
| Owner | Can log in, open dashboard, Pilot KPI Report, Integration Status, and Health Status. |
| Admin | Can log in, open Lead Inbox, and complete Stage 3 manual intake using fake data. |
| Manager | Can log in, open Manager dashboard, Operational Queues, and escalation views. |
| Executive | Can log in, see assigned leads, tasks, visits, SLA countdowns, and next actions. |

## Access-Control Checks

- Password reset readiness is configured for demo users.
- Invitation email readiness is configured if invitation flow is demonstrated.
- Protected routes reject logged-out users.
- Executive cannot access owner-only or management-only controls.
- Manager cannot access owner-only health controls when restricted by the app.
- Logout ends the session.
- A fresh browser session requires login.

## Before Stakeholder Demo

- Confirm all four role accounts work.
- Confirm no real buyer data is visible.
- Confirm unavailable integrations still show `Not available`.
- Confirm demo users understand this is not production deployment.
