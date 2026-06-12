# PropIQ AI Stage 3 Manual Review UI Fix Report

Updated: June 13, 2026

## Verdict

**STAGE 3 READY FOR MANUAL RE-REVIEW**

Stage 4 has not started.

## Manual Review Gap

The visible Lead Inbox Add Lead form used the legacy `POST /api/leads` route.
That route created a basic lead but did not create Stage 3 intake events,
integration metadata, duplicate evidence, AI qualification state, or the
external intake timeline.

This made the implemented Stage 3 workflow inaccessible to a non-technical
reviewer.

## Product Fix

The existing Add Lead panel is now a clearly labeled **Stage 3 Manual Intake**
flow and submits to:

`POST /api/intake/manual`

The form exposes:

- buyer name, phone, email, and project;
- budget minimum, maximum, and free-text description;
- purchase timeline;
- enquiry message;
- source and channel;
- campaign;
- received time;
- preferred location;
- site visit request;
- negotiation intent;
- booking intent;
- legal or RERA question;
- human requested;
- angry or confused state;
- competitor comparison.

The created lead opens directly in Lead Detail.

## Persisted Review Evidence

Lead Detail now clearly displays:

- source and channel;
- campaign;
- received time;
- preferred location;
- AI status;
- AI confidence when available;
- validated AI signals when available;
- duplicate state;
- after-hours state;
- persisted timeline events;
- deterministic score, priority, handoffs, SLA, tasks, and alerts.

Dashboard and Pilot Report metrics continue to use persisted Stage 3 records.

## AI-Unavailable Behavior

If the AI provider is unavailable:

- `ai_qualification_status` remains `NOT_AVAILABLE`;
- intake metadata is still persisted;
- explicit reviewer-entered budget, timeline, and qualification signals are
  validated server-side;
- those validated values feed the deterministic Stage 2 scoring, handoff, SLA,
  task, timeline, and alert workflow;
- the UI explains this behavior instead of presenting an unexplained empty AI
  panel.

AI does not make final score, priority, assignment, authorization, or security
decisions.

## Lead Detail Actions

The following actions were verified:

- Save Qualification;
- Create or update Handoff;
- Mark Qualified;
- Mark Contacted;
- Mark Booked;
- Move to Lost;
- Internal Alerts navigation;
- SLA Alerts navigation;
- Settings & Webhook navigation.

Successful actions now show visible confirmation. API failures continue to use
the global user-facing error banner. Executives see a clear explanation that
handoff creation requires Owner, Admin, or Manager permission.

The Settings page now correctly states that Stage 3 website, manual UI, and
authenticated webhook intake are available while third-party delivery remains
`Not available`.

## Tests

- Focused Stage 3 API, qualification, and intake tests: 17 passed.
- Full live unit/API/security/workflow suite: 90 passed, 0 failed, 0 skipped.
- Dedicated visible Stage 3 intake Playwright test: passed.
- Full Playwright suite: 6 passed, 0 failed, 0 skipped.
- Lint: passed.
- Type-check: passed.
- Production client and server build: passed.

The production client entry chunk is 611.43 kB, 182.81 kB gzip. This remains a
P1 performance follow-up and does not block Stage 3 functional acceptance.

## Git State

This report and the implementation are intended for the existing branch:

`stage-3/external-intake-ai-qualification`

No merge is authorized. Stage 4 should begin only after the updated Stage 3
manual review is accepted.
