# Secret Handling

## Core Rule

No real secret belongs in Git, docs, screenshots, test artifacts, logs, or chat.

## Secrets Covered

- Supabase URL if treated as environment-specific.
- Supabase anon key.
- Supabase service-role key.
- Database URLs.
- Database passwords.
- Webhook secrets.
- Seed passwords.
- SMTP credentials.
- Hosting provider tokens.
- Browser or API session tokens.

## Storage

Use only:

- hosting platform environment variable controls;
- Supabase dashboard settings;
- local ignored environment files;
- a password manager.

## Documentation

Documentation may use placeholders such as `<DEMO_SUPABASE_URL>` and
`<DEMO_SEED_PASSWORD>`. It must not include real values.

## Logging

Logs must not include:

- request bodies;
- authorization headers;
- cookies;
- passwords;
- database URLs;
- API keys;
- service-role keys;
- webhook secrets;
- stack traces in user-facing responses.

## Health Endpoints

Health endpoints may report configuration presence using booleans. They must
not return actual configured values.

## Rotation

Rotate demo secrets when:

- a demo user leaves the pilot group;
- a screen share accidentally reveals a credential;
- a hosting provider credential is copied into an unsafe place;
- a public demo link is shared wider than intended;
- before moving from demo/staging to any production-like review.
