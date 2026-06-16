# PropIQ AI Pilot Demo Walkthrough

## Preparation

- Use seeded pilot test accounts only.
- Use the seeded test password from the local ignored `.env.local` file.
- Do not share passwords in demo documents or screenshots.
- Confirm this is a pilot-demo walkthrough, not a production deployment.

## Step-By-Step Walkthrough

1. Login as Owner.
   - Use the Owner test account label from `docs/demo/PILOT_TEST_ACCOUNTS.md`.
   - Open the authenticated application.

2. Open Owner Dashboard.
   - Show total leads, HOT leads, qualified leads, duplicates, after-hours,
     SLA, handoff, visit, source, team, and pilot health metrics.

3. Show Pilot Health.
   - Explain that health checks cover API, database, and configuration
     readiness.
   - Confirm no secrets are shown in health output.

4. Open Lead Inbox.
   - Explain that the Lead Inbox is where new inquiries and existing leads
     enter daily sales operations.

5. Open one HOT lead.
   - Show the lead detail view.
   - Explain buyer context, intake metadata, priority, status, and timeline.

6. Explain Score.
   - Explain that the score is deterministic and business-rule driven.
   - AI can assist signal extraction, but the final workflow is not based on
     opaque AI autonomy.

7. Explain Handoff.
   - Show assigned owner or escalation context.
   - Explain how a lead moves from inquiry to accountable follow-up.

8. Explain SLA.
   - Show deadline, breach, or escalation context.
   - Explain that delayed action becomes visible to managers.

9. Open Operational Queues.
   - Explain queues as the daily action layer for sales management.

10. Apply Critical Filter.
    - Show the highest-risk operational items first.
    - Use this to discuss manager intervention and recovery discipline.

11. Open Pilot KPI Report.
    - Show source distribution, priority distribution, SLA metrics,
      duplicates, after-hours leads, visit funnel, workload, alerts, AI
      coverage, and integration failures.
    - Point out that revenue opportunity is `Not available`.

12. Open Integration Status.
    - Show available internal intake routes.
    - Show unavailable external providers clearly marked.

13. Show Unavailable Providers.
    - Explain that WhatsApp, telephony, Meta Lead Ads, CRM sync, and other
      integrations are intentionally deferred until after pilot validation.

14. Login as Manager.
    - Use the Manager test account label.
    - Do not expose or document the password.

15. Show Manager Queue.
    - Show team workload, overdue handoffs, SLA due and breached, unassigned
      HOT leads, visit follow-up, duplicate review, and escalations.

16. Login as Executive.
    - Use the Executive test account label.
    - Do not expose or document the password.

17. Show Assigned Action Queue.
    - Show assigned leads, HOT actions, follow-ups, visits, SLA countdowns,
      buyer intent, and next best actions.

18. Close With Pilot Next Steps.
    - Confirm this demo is ready for pilot-demo preparation.
    - Ask stakeholders which metrics they trust, which workflow gaps matter
      most, and which deferred integrations should be prioritized after pilot
      validation.
