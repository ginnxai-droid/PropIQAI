# Integration Readiness

## Provider Registry

Available:

- Manual UI
- Website form
- Secret-authenticated webhook

Not available:

- WhatsApp
- Telephony
- Meta Lead Ads
- CRM synchronization

The Integration Status page reports these states explicitly. Stage 4 does not
claim external delivery for unavailable providers.

## Event Model

Existing integration events provide provider, event type, processing status,
raw payload reference, error message, and timestamps. Failed events are visible
in the pilot overview. This structure is retry and replay ready, but Stage 4
does not automatically replay external events.

Future n8n, WhatsApp, or CRM adapters must authenticate inbound requests,
translate them into the existing intake contract, preserve tenant context, and
record processing outcomes without logging secrets or raw personal data.
