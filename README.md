# PropIQ AI

PropIQ AI Stage 1 is a secure, multi-tenant real-estate lead operations
application. The existing React interface is backed by Supabase Auth,
PostgreSQL Row-Level Security, and an authenticated Express API.

## Stack

- React 19, Vite 6, TypeScript, Tailwind CSS
- Express API with Zod validation, Helmet, CORS, and rate limiting
- Supabase Auth and PostgreSQL
- PostgreSQL RLS for tenant and project isolation
- Vitest and Supertest

## Prerequisites

- Node.js 20 or later
- npm
- A local or isolated Supabase project
- Supabase CLI for applying migrations

## Local Setup

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set:

   ```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-public-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
   SEED_DEFAULT_PASSWORD=use-a-unique-development-only-password
   APP_URL=http://localhost:3000
   API_PORT=3001
   ALLOWED_ORIGINS=http://localhost:3000
   ```

   Never prefix the service-role key with `VITE_` or commit it.

3. Apply the migrations in `supabase/migrations`:

   ```powershell
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

4. Seed development users and two isolated organizations:

   ```powershell
   npm run seed
   ```

5. Start the web and API development servers:

   ```powershell
   npm run dev
   ```

The seed script prints the development logins. It refuses to run when
`NODE_ENV=production`.

## Verification

```powershell
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
```

Run the live tenant-isolation tests only against the seeded local or test
project:

```powershell
$env:RUN_SUPABASE_INTEGRATION_TESTS="true"
npm test
```

## Production

Set `NODE_ENV=production`, provide the public Supabase values at client build
time, and provide the service-role key only to the server runtime.

```powershell
npm run build
npm start
```

The Express server serves the built client from `dist` in production.
Configure the deployed `/reset-password` URL in Supabase Auth redirect URLs.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Security model](docs/SECURITY_MODEL.md)
- [Stage 1 remediation plan](docs/REMEDIATION_STAGE_1_PLAN.md)
- [Production-readiness report](docs/REMEDIATION_STAGE_1_REPORT.md)
- [Stage 1B live-verification plan](docs/REMEDIATION_STAGE_1B_PLAN.md)
- [Stage 1B live-verification report](docs/REMEDIATION_STAGE_1B_REPORT.md)
- [Backup and restore procedure](docs/BACKUP_AND_RESTORE.md)

External WhatsApp, telephony, n8n, AI-processing, payment, and post-booking
integrations are intentionally not implemented in Stage 1.
