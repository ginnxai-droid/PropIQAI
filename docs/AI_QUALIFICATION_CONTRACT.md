# Stage 3 AI Qualification Contract

Updated: June 12, 2026

## Purpose

AI qualification converts untrusted inbound text into structured sales signals.
It does not make authorization, assignment, score, priority, or tenant decisions.

## Status

- `COMPLETED`: structured output passed server validation.
- `FAILED`: an extractor returned invalid output or failed safely.
- `NOT_AVAILABLE`: no validated extractor is configured.
- `PENDING`: intake is still being processed.

Lead creation is never blocked by `FAILED` or `NOT_AVAILABLE`.

## Structured Output

The validated JSON contract contains:

- `budget_min`, `budget_max`;
- `purchase_timeline`;
- `buyer_type`;
- `engagement_quality`;
- `site_visit_request`;
- `negotiation_intent`;
- `booking_intent`;
- `compliance_question`;
- `human_requested`;
- `angry_or_confused`;
- `competitor_comparison`;
- `preferred_project`, `preferred_location`;
- `sentiment`, `summary`, `key_questions`, `objections`;
- `confidence` from 0 through 1.

Unknown keys are discarded by the server contract. Invalid ranges or enum
values are rejected.

## Authority Boundary

Validated output may update qualification inputs only. It cannot set:

- `organization_id` or project access;
- `assigned_to`;
- membership, role, permission, or RLS state;
- `score`, `priority`, `scoring_version`, or SLA;
- handoff, alert, or task records directly.

After persistence, `runLeadWorkflow` recalculates `stage-2-v1` score and applies
deterministic handoff, SLA, and task rules.

## Implementations

- `local`: deterministic structured extractor used for controlled development
  and test verification.
- `unavailable`: truthful fallback for deployments without an approved AI
  provider.

Production AI autonomy and external provider integration are outside Stage 3.
