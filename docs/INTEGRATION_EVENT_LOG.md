# Stage 3 Integration Event Log

Updated: June 12, 2026

`integration_events` is the operational record for inbound lead events.

## Fields

- organization, provider, channel, and event type;
- received time and processing status;
- safe error message and retry count;
- raw payload reference;
- created lead or duplicate lead reference;
- created and updated timestamps.

Processing status is one of `RECEIVED`, `PROCESSED`, `DUPLICATE`, or `FAILED`.

The raw reference points to `lead_intake_events`, where the bounded sanitized
payload and normalized payload are stored. Neither table grants authenticated
browser access. Authorized APIs return intake summaries without `raw_payload`
or `normalized_payload`.

## Duplicate Evidence

`lead_duplicate_events` records:

- the original intake event;
- the existing tenant-scoped lead;
- match reasons such as `SAME_PHONE`, `SAME_EMAIL`,
  `SAME_PHONE_AND_PROJECT`, or `SAME_EMAIL_AND_PROJECT`.

The existing lead is not overwritten.

## Retry Scope

Stage 3 records `retry_count` but does not implement an autonomous retry worker.
External retry orchestration is `Not available`.
