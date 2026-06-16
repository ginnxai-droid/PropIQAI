# PropIQ AI Stage 5 Scope Precheck

Updated: June 16, 2026

## 1. Current Product Status

PropIQ AI is accepted for pilot-demo preparation. It is not yet accepted for
production deployment. Stage 5 has not started.

The current release baseline is intended to remain `release/pilot-ready-v1`.
This document is a scope pre-check only. It does not implement Stage 5, create
migrations, modify product behavior, authorize production deployment, merge, or
push.

## 2. What Is Already Pilot-Demo Ready

The Stage 1 through Stage 4 product scope is ready for pilot-demo preparation:

- Secure authenticated foundation, role permissions, tenant isolation, backup
  and restore evidence, and closure verification.
- Core revenue recovery workflow: persisted lead workflow, deterministic score,
  handoff, SLA, tasks, site visits, timeline, and persisted dashboard metrics.
- External and manual intake: manual, website, and webhook intake routes,
  duplicate detection, after-hours detection, AI-assisted signal extraction,
  `NOT_AVAILABLE` fallback, alerts, and Stage 3 reviewer surfaces.
- Pilot readiness: Owner, Manager, Executive, and Admin dashboards; pilot KPI
  report; operational queues; integration readiness labels; health surfaces;
  synthetic pilot data; observability; safe errors; and bundle optimization.
- Demo readiness pack: business overview, scripts, walkthrough, storyboard,
  test-account guidance, feedback form, limitations, success criteria, and
  next-step documents.

## 3. What Is Not Production-Ready Yet

The product is not yet ready for production deployment because several
deployment, operational, data-governance, and external-integration decisions
remain outside the accepted Stage 1 through Stage 4 scope:

- No dedicated secure demo or staging environment has been formally configured.
- No production deployment runbook has been executed against a production-like
  environment.
- Live buyer-data handling, access control ownership, retention, and pilot data
  separation need stakeholder approval.
- Real WhatsApp, telephony, Meta Lead Ads, CRM synchronization, payment,
  inventory, channel partner, and paid export integrations are not implemented.
- Production external AI autonomy is not enabled.
- Demo review feedback has not yet been captured from pilot stakeholders.
- Stage 5 scope has not yet been authorized.

## 4. Stage 5 Option Comparison

| Option | Business value | Technical risk | Demo value | Pilot-readiness impact | Production-deployment dependency | Security risk | Build complexity | Build first | Keep out of scope |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Deployment readiness and demo environment | Very high: enables credible stakeholder demos and controlled pilot access | Medium: environment, config, auth, data, and runbook correctness matter | Very high: gives a stable demo URL and repeatable demo setup | Very high: converts local readiness into usable pilot-demo readiness | Direct dependency: this is the deployment foundation | Medium: secrets, allowed origins, test data, access, logs, and environment separation must be controlled | Medium | Secure demo/staging environment, deployment runbook, demo data reset, access checklist, smoke tests | Production launch, live buyer rollout, paid integrations |
| WhatsApp + n8n integration | High if stakeholders demand WhatsApp lead capture or follow-up | High: webhook security, retries, rate limits, message templates, opt-in, provider behavior | Medium to high if demo audience expects WhatsApp | Medium: useful, but risky before a stable deployed endpoint exists | Strong dependency on secure public deployment and webhook URL | High: public webhooks, secrets, PII, message content, provider credentials | High | Only after secure demo environment exists; start with inbound event mock or sandbox design | Production messaging, automated outbound campaigns, real customer numbers |
| Real pilot customer onboarding | Very high for business validation | High: data governance, access setup, tenant separation, support, consent, and success measurement | Medium: more pilot than demo | High, but only after demo feedback and deployment readiness | Strong dependency on secure demo/staging or controlled pilot environment | High: real buyer data, user access, audit, deletion, and support expectations | High | Onboarding checklist and pilot governance after demo review | Broad rollout, multi-customer onboarding, production SLA commitments |
| CRM synchronization | Medium to high if the customer already depends on CRM | High: schemas, field mapping, conflict handling, retries, auth, and audit | Medium: less visible unless stakeholder is CRM head | Medium: can unblock a real pilot if CRM is mandatory | Depends on deployed environment and customer CRM access | High: PII transfer, credentials, bidirectional sync risk | High | Field-mapping discovery and one-way export design after deployment readiness | Bidirectional sync, destructive updates, multi-CRM support |
| Production AI provider enablement | Medium: improves signal extraction, but deterministic workflow already works | Medium to high: validation, cost, latency, failure modes, prompt safety | Medium: demo can already show fallback; live AI may impress but is not core blocker | Medium: helpful after trust and deployment basics | Depends on secure environment, monitoring, cost controls, and fallback | Medium: buyer text, prompt handling, provider logs, output validation | Medium | Provider configuration, validation, cost guardrails after secure demo environment | AI-driven final decisions, autonomous assignment, unvalidated output |
| Reporting/export packaging | Medium: helps stakeholder sharing and follow-up | Low to medium: export formatting, snapshots, access, and stale data issues | High for sales and owner review if polished | Medium: useful demo artifact, not core platform foundation | Low to medium: can be local or deployed, but real sharing needs access control | Medium: exported reports may contain sensitive buyer or team data | Medium | Read-only pilot report packaging after demo feedback | Paid PDF export, automated external sharing, public report links |

## 5. Recommended Stage 5 Direction

The best Stage 5 direction is:

**Deployment Readiness + Secure Demo Environment.**

This should be chosen before WhatsApp, telephony, CRM sync, production AI, or
real pilot onboarding because the product is already pilot-demo ready locally,
but stakeholder review needs a stable, secure, repeatable environment.

The next stage should reduce demo and pilot risk before adding external
surface area.

## 6. Recommended Stage 5A Scope

Stage 5A should be a narrow deployment-readiness and secure-demo-environment
track.

Build first:

- Secure demo/staging deployment plan.
- Environment separation plan for local, demo, and future production.
- Demo-safe configuration checklist.
- Allowed-origin, Auth redirect, CORS, rate-limit, and webhook-secret handling
  checklist.
- Seeded demo-user and synthetic-data reset process for the deployed demo
  environment.
- Smoke-test checklist for Owner, Admin, Manager, Executive, Lead Inbox,
  Operational Queues, Pilot KPI Report, Health Status, Integration Status, and
  Stage 3 intake.
- Secret-handling checklist for deployment variables and logs.
- Rollback and demo-reset runbook.
- Demo review checklist for stakeholders.
- Confirmation that Stage 5A still does not include live buyer data unless
  separately approved.

Acceptance target:

- A secure, repeatable demo environment exists or is fully specified.
- Stakeholders can review the current product without requiring a developer
  machine.
- The product remains clearly marked as pilot-demo ready, not production
  deployed.

## 7. Recommended Stage 5B Scope

Stage 5B should be selected after demo review feedback.

Recommended Stage 5B candidates:

1. Pilot customer onboarding preparation if stakeholders accept the demo and
   want a controlled real pilot.
2. Reporting/export packaging if owners and sales heads need a polished review
   artifact before pilot sign-off.
3. WhatsApp + n8n sandbox design if WhatsApp is confirmed as the first required
   integration and the secure demo environment is already available.

Stage 5B should not begin until Stage 5A produces a secure environment and the
demo review identifies the highest-value next capability.

## 8. Explicit Out-Of-Scope Items

The following should remain out of Stage 5A scope:

- Stage 5 product implementation beyond deployment-readiness planning and
  secure demo-environment preparation.
- New database migrations.
- Production deployment approval.
- Real buyer-data onboarding.
- WhatsApp production automation.
- Telephony or AI voice calling.
- Meta Lead Ads production integration.
- CRM bidirectional synchronization.
- Production external AI autonomy.
- Payment module.
- Channel partner portal.
- Inventory engine.
- Paid PDF export.
- Public report links.
- Any workflow that requires exposing secrets in documentation or source code.

## 9. Risks Of Building WhatsApp Before Deployment

Building WhatsApp or n8n before a secure deployment foundation creates avoidable
risk:

- Webhooks require a stable public endpoint; local-only behavior is not enough.
- Provider secrets and webhook verification need strict storage, rotation, and
  logging rules.
- Message content can include buyer personal data and must not leak into logs,
  screenshots, or test artifacts.
- n8n workflows can bypass product authorization boundaries if not designed
  carefully.
- Retry behavior, duplicate events, idempotency, and failure visibility become
  production-facing concerns immediately.
- WhatsApp templates, opt-in, provider approval, rate limits, and delivery
  semantics can delay the build.
- A failed integration demo can distract from the already working core value:
  lead discipline, SLA visibility, queues, dashboards, and KPI trust.

WhatsApp should be designed only after the secure demo environment exists, and
it should start as a sandbox or mock integration unless a pilot stakeholder
explicitly requires real WhatsApp for the first controlled pilot.

## 10. Risks Of Deploying Before Demo Review

Deploying too broadly before demo review also has risk:

- Stakeholders may reject or reprioritize key workflows after seeing the demo.
- Public access may create support and security expectations before the scope is
  agreed.
- Real buyer-data questions may arrive before data governance is ready.
- Demo users may confuse pilot-demo readiness with production deployment.
- Environment configuration mistakes can create misleading failures during the
  stakeholder review.
- Unavailable integrations may be interpreted as defects if the demo narrative
  is not aligned first.

The safer path is a secure demo environment with synthetic data, clear access
limits, explicit `Not available` labels, and a structured feedback process.

## 11. Final Recommendation

Stage 5 should start, when authorized, with **Deployment Readiness + Secure Demo
Environment** as Stage 5A.

Do not jump directly to WhatsApp, telephony, CRM synchronization, production AI
provider enablement, or real customer onboarding. Those items add external
surface area before the product has a secure, repeatable, stakeholder-reviewed
demo environment.

The best sequence is:

1. Complete Stage 5A deployment-readiness and secure-demo-environment work.
2. Run stakeholder demo review using the existing demo readiness pack.
3. Use feedback to choose Stage 5B:
   - pilot onboarding if stakeholders approve controlled live validation;
   - reporting/export packaging if decision-makers need shareable artifacts;
   - WhatsApp + n8n sandbox if messaging is confirmed as the first integration.

Final decision:

**Recommended Stage 5 direction: Deployment Readiness + Secure Demo
Environment.**

**Recommended first build: Stage 5A secure demo environment and deployment
readiness, not WhatsApp or telephony.**
