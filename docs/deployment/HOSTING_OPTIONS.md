# Hosting Options

## Recommendation

For a non-technical builder, the safest simple path is:

1. Supabase dedicated demo/staging project.
2. Render or Railway for the combined Node API and built frontend if supported
   by the selected deployment layout.
3. Provider environment variables for all secrets.
4. Post-deployment smoke test after every deployment.

## Render

Pros:

- Simple web service model.
- Good environment variable UI.
- Easy rollback to previous deploys.
- Suitable for API hosting.

Risks:

- Build/start commands must be configured carefully.
- Free or low-tier services may sleep.

## Railway

Pros:

- Fast setup.
- Simple environment variable management.
- Good for Node services.

Risks:

- Project/environment boundaries must be clear.
- Usage costs should be monitored.

## Fly.io

Pros:

- Strong operational control.
- Good for globally deployed services.

Risks:

- More CLI and networking knowledge required.
- Less ideal for a non-technical demo operator.

## Vercel + API Host

Pros:

- Strong frontend hosting.
- Simple previews.

Risks:

- The Express API still needs a separate host.
- Split frontend/API origin increases CORS and configuration complexity.

## Supabase

Use Supabase for:

- Auth;
- database;
- RLS;
- demo/staging project isolation;
- Auth email configuration if needed.

Do not use the production project for demo reset or synthetic data generation.
