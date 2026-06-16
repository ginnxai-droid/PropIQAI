# Stage 5B Pilot Demo Rehearsal Plan

Updated: June 17, 2026

## Demo Objective

Rehearse PropIQ AI as a secure pilot-demo-ready revenue recovery and lead
discipline platform for Indian real estate developers.

The rehearsal must prove that the demo can be presented end-to-end using fake
data only, across Owner/Admin, Manager, and Executive roles, without production
deployment, real customer data, live integrations, or production credentials.

## Audience Assumptions

The rehearsal is designed for:

- developer owner;
- sales head;
- CRM head;
- marketing head;
- operations head;
- pilot stakeholder;
- internal demo operator.

Stakeholders should leave with a clear understanding of how PropIQ AI supports
missed-lead recovery, HOT-lead visibility, duplicate review, SLA discipline,
handoff accountability, site-visit follow-up, operational queues, and pilot KPI
reporting.

## Demo Environment Assumptions

- The product is accepted for secure pilot-demo preparation only.
- The product is not accepted for production deployment.
- Stage 5A secure demo readiness is complete.
- The demo environment uses seeded test users.
- The demo environment uses synthetic pilot data only.
- No production endpoints, production credentials, or real buyer data are used.
- Unsupported integrations remain clearly marked `Not available`.

## Fake/Demo Data Assumptions

Use the guarded demo reset flow:

```powershell
$env:PILOT_DATA_MODE = "development"
npm run seed
npm run pilot-data
```

Expected demo data includes:

- seeded Owner/Admin/Manager/Executive users;
- fake leads;
- duplicate inquiry;
- after-hours inquiry;
- AI-unavailable case;
- SLA breach;
- internal alert;
- site visits;
- failed retry-ready integration event.

## Roles To Be Shown

- Owner/Admin: pilot health, KPI report, integration status, health status,
  manual intake, and lead detail.
- Manager: management dashboard, operational queues, escalations, SLA risk,
  workload, duplicate review, and site-visit follow-up.
- Executive: assigned leads, HOT actions, follow-up tasks, visits, SLA
  countdowns, buyer intent, and next actions.

## Rehearsal Sequence

1. Reset demo data.
2. Run the dry-run smoke checklist.
3. Open with the business problem.
4. Show Owner dashboard and pilot health.
5. Show Pilot KPI Report.
6. Show Integration Status and unavailable providers.
7. Show Health Status without exposing secrets.
8. Switch to Admin/Lead Inbox.
9. Create or review a fake Stage 3 intake lead.
10. Explain score, priority, handoff, SLA, tasks, and alerts.
11. Show Operational Queues with critical filter.
12. Switch to Manager and show queue/workload accountability.
13. Switch to Executive and show assigned next actions.
14. Re-state known limitations.
15. Capture stakeholder feedback.

## Pre-Demo Checks

- Confirm branch and commit intended for demo.
- Confirm no real customer data is present.
- Confirm seeded role accounts are available.
- Confirm the seeded password is stored outside demo docs.
- Run `npm run demo:smoke -- --dry-run`.
- Confirm Integration Status shows unavailable providers correctly.
- Confirm Health Status does not expose values.
- Confirm Pilot KPI Report does not fabricate revenue opportunity.
- Confirm demo reset runbook is available.
- Confirm feedback capture sheet/doc is ready.

## During-Demo Checks

- Do not reveal passwords or environment values.
- Use fake buyer data only.
- Explicitly state this is not production deployment.
- Call out `Not available` providers directly.
- Avoid fake ROI claims.
- Keep the demo focused on operating discipline and stakeholder trust.
- Capture confusing points immediately.

## Post-Demo Checks

- Record stakeholder feedback.
- Classify feedback as demo blocker, pilot blocker, later enhancement, or
  production blocker.
- Confirm whether any out-of-scope request was raised.
- Reset demo data if another rehearsal or stakeholder session will follow.
- Confirm no screenshots or exports with sensitive data were created.

## Abort/Reset Conditions

Abort or reset the rehearsal if:

- a real customer record appears;
- a password or secret is visible;
- health/config exposes values;
- unavailable providers appear available;
- login or role navigation fails;
- fake data reset fails;
- stakeholders confuse the demo with production deployment;
- the demo operator cannot explain a visible limitation.

## Success Criteria

Stage 5B rehearsal readiness is successful when:

- the demo can be rehearsed end-to-end using fake data only;
- Owner/Admin, Manager, and Executive journeys are clear;
- smoke checks can be run before the demo;
- demo reset is repeatable;
- known limitations are explained without defensiveness;
- feedback can be captured cleanly;
- no production secrets, endpoints, or real customer data are required;
- no out-of-scope integration work has started.
