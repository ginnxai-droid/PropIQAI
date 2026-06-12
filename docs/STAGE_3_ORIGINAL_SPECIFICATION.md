# PropIQ AI Stage 3 Original Specification

Source: Codex temporary attachment received June 12, 2026.

This document preserves the original Stage 3 implementation brief as a durable
repository artifact. Formatting and mojibake characters from the temporary text
attachment were normalized, but the requirements are unchanged.

## Foundation And Scope

Stage 1 is closed.
Stage 2 is complete.
The implementation branch is:

`stage-3/external-intake-ai-qualification`

Do not modify Stage 1 security foundations unless required for Stage 3 safety.
Do not break Stage 2 deterministic scoring, handoff, SLA, site visit, dashboard,
or timeline workflow.

Do not add:

- WhatsApp automation
- telephony
- payment module
- channel partner portal
- full CRM replacement
- production AI autonomy without validation

## Stage 3 Objective

Connect external lead intake and AI-assisted qualification to the existing
Stage 2 workflow.

Required flow:

External lead received
-> lead normalized
-> duplicate checked
-> source tagged
-> after-hours detected
-> AI extracts qualification signals
-> server validates extracted fields
-> deterministic scoring recalculates
-> handoff/SLA/task rules run
-> dashboard and timeline update from persisted data.

## 1. Create Stage 3 Plan First

Before coding, create:

`docs/STAGE_3_EXTERNAL_INTAKE_AI_QUALIFICATION_PLAN.md`

Include:

1. Stage 1 and Stage 2 foundation summary
2. Existing workflow dependencies
3. Files to modify
4. Files to create
5. Database changes needed
6. API changes
7. UI changes
8. AI extraction approach
9. Webhook intake approach
10. Duplicate detection approach
11. Alerting approach
12. Security model
13. Test plan
14. Risks
15. Acceptance criteria

Do not start implementation until this plan exists.

## 2. External Lead Intake

Implement secure intake routes for:

1. website form intake;
2. webhook intake;
3. manual JSON intake for testing.

Each incoming lead must support:

- buyer name
- phone
- email
- project interest
- budget text or amount
- preferred location
- message
- source
- campaign
- received_at
- channel
- raw_payload

Persist:

- normalized lead record
- raw intake event
- source metadata
- audit log

Reject malformed input safely.

## 3. Duplicate Detection

Implement duplicate detection:

- same phone within same organization;
- same email within same organization;
- same phone plus same project;
- same email plus same project.

When duplicate is found:

- do not silently overwrite;
- create duplicate event;
- link to existing lead;
- optionally append conversation/intake note;
- preserve original raw payload.

Cross-tenant duplicates must not leak data.

## 4. After-Hours Detection

Use default business hours:

- Monday to Saturday
- 10:00 AM to 7:00 PM
- India timezone

Persist:

- is_after_hours
- received_at
- business_hours_version

After-hours hot leads should create higher urgency alert records.

## 5. AI Qualification Extraction

Add an AI extraction service interface.

The AI should extract structured signals only:

- budget amount or range
- purchase timeline
- buyer intent
- site visit request
- negotiation intent
- booking intent
- legal/RERA/payment/possession question
- human requested
- angry/confused sentiment
- competitor comparison
- preferred project
- preferred location

AI must return structured JSON only.

Server must validate AI JSON before saving.

AI must never directly:

- assign users;
- change permissions;
- bypass RLS;
- make security decisions;
- make final score/priority decisions.

If AI is unavailable, create the lead and mark AI status as:

`Not available`

## 6. Deterministic Workflow Trigger

After intake and AI extraction:

1. update qualification fields;
2. recalculate deterministic score;
3. assign priority;
4. create handoff if rules match;
5. create SLA event if required;
6. create callback/follow-up task if required;
7. append timeline events;
8. update dashboard from persisted records.

Do not create fake metrics.

## 7. Internal Alert Records

Create persisted alerts for:

- HOT lead
- priority HOT lead
- SLA due soon
- SLA breached
- manager escalation
- after-hours high-intent lead
- duplicate lead detected

Alert fields:

- organization_id
- lead_id
- alert_type
- severity
- status
- assigned_role
- message
- created_at
- acknowledged_at
- resolved_at

No external notification integration is required in Stage 3.

## 8. Integration Event Log

Create an integration event log for inbound events.

Capture:

- provider
- channel
- event_type
- received_at
- processing_status
- error_message
- retry_count
- raw_payload_reference
- lead_id if created
- duplicate_of_lead_id if duplicate

Do not store secrets in logs.

## 9. Security Requirements

All Stage 3 routes must enforce:

- organization scoping
- webhook secret validation where applicable
- server-side validation
- audit logging
- no secret logging
- no cross-tenant data exposure
- RLS compatibility
- safe error messages

Do not expose service-role keys to the client.

## 10. UI Requirements

Update only necessary screens:

1. Lead Inbox: show source, AI status, duplicate indicator, after-hours badge.
2. Lead Detail: show intake event, AI extracted signals, confidence/status,
   timeline.
3. Dashboard: show intake count, hot intake count, duplicate count, after-hours
   count.
4. Alerts page or alert section: show internal alerts.
5. Pilot Report: include intake and AI qualification metrics.

Unsupported external integrations must show:

`Not available`

## 11. Tests Required

### Intake

- valid website form intake
- valid webhook intake
- invalid payload rejected
- raw payload stored safely
- source and campaign stored
- lead created correctly

### Duplicate Detection

- same phone duplicate
- same email duplicate
- same project duplicate
- cross-tenant duplicate not leaked
- duplicate event created

### AI Extraction

- valid AI JSON accepted
- invalid AI JSON rejected safely
- AI unavailable fallback
- extracted fields update qualification
- AI cannot bypass deterministic scoring

### Workflow Trigger

- AI site-visit intent creates handoff/SLA
- negotiation intent creates handoff
- legal/RERA question creates compliance handoff
- angry/confused buyer creates escalation
- human requested creates handoff
- after-hours hot lead creates alert

### Alerts

- hot lead alert
- SLA alert
- breach alert
- manager escalation alert
- duplicate alert
- acknowledge alert
- resolve alert

### Security

- webhook secret required
- invalid webhook secret rejected
- unauthenticated protected routes rejected
- cross-tenant access denied
- service-role key not exposed
- no secrets in tracked files

### E2E

Add a Playwright test:

1. Submit lead through intake route.
2. Confirm lead appears in Lead Inbox.
3. Open Lead Detail.
4. Confirm AI extraction/signals appear if available.
5. Confirm deterministic score appears.
6. Confirm handoff/SLA/alert appears when rules match.
7. Confirm dashboard updates.

## 12. Verification Commands

Run:

- `npm run seed`
- `npm run seed` again
- full unit/API/security/workflow tests
- live Supabase tests
- Playwright tests
- Supabase database lint
- migration check
- lint
- typecheck
- production build
- `npm audit --audit-level=high`
- secret scan

No required test may be skipped.

## 13. Documentation

Create or update:

- `docs/STAGE_3_EXTERNAL_INTAKE_AI_QUALIFICATION_PLAN.md`
- `docs/STAGE_3_EXTERNAL_INTAKE_AI_QUALIFICATION_REPORT.md`
- `docs/AI_QUALIFICATION_CONTRACT.md`
- `docs/WEBHOOK_INTAKE_SECURITY.md`
- `docs/INTEGRATION_EVENT_LOG.md`
- `docs/ALERT_RULES.md`
- `docs/PILOT_WORKFLOW_ACCEPTANCE.md`

The Stage 3 report must include:

1. features implemented
2. files changed
3. database changes
4. intake routes
5. duplicate detection logic
6. AI extraction logic
7. deterministic workflow trigger result
8. alert logic
9. dashboard changes
10. security model
11. tests added
12. tests passed/failed/skipped
13. build result
14. audit result
15. secret scan result
16. remaining blockers
17. whether Stage 3 is complete

## 14. Git Discipline

Do not commit secrets.
Do not commit backup files.
Do not modify `.env.local`.
Do not modify `.env.database-closure.local`.

At the end, if Stage 3 passes:

1. run final secret scan;
2. create a commit;
3. provide commit hash;
4. do not merge automatically.

Recommended commit message:

`feat: implement Stage 3 external lead intake and AI qualification`

## Final Response Required

Return:

1. Stage 3 verdict
2. intake result
3. duplicate detection result
4. AI qualification result
5. workflow trigger result
6. alert result
7. dashboard result
8. tests passed/failed/skipped
9. build result
10. audit result
11. secret scan result
12. commit hash if created
13. whether Stage 4 may begin
