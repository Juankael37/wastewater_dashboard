---
name: Connect Supabase + Cloudflare
overview: Connect the existing Supabase project and Cloudflare account to this repo by deploying the Supabase schema, configuring required environment variables/secrets for the Cloudflare Worker API, and wiring the React PWA to the deployed API with correct CORS origins.
todos:
  - id: get-ids
    content: Collect Supabase project ref and intended Cloudflare Pages project name/URL.
    status: completed
  - id: deploy-supabase-schema
    content: Apply `supabase_schema.sql` in Supabase SQL Editor and verify required tables exist.
    status: completed
  - id: configure-worker-env
    content: "Set Worker vars/secrets: SUPABASE_URL, SUPABASE_ANON_KEY, ALLOWED_ORIGINS; deploy with Wrangler."
    status: completed
  - id: configure-pwa-env
    content: Set frontend env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL) for dev/prod builds.
    status: completed
  - id: rls-policies
    content: Enable RLS and add minimal policies aligned with current Worker queries and user roles.
    status: completed
  - id: smoke-test
    content: Run end-to-end auth + measurements + alerts calls against deployed Worker + Supabase.
    status: completed
isProject: false
---

**Keep todos in sync:** From repo root run `.\scripts\sync-connect-plan-todos.ps1` (check) or `.\scripts\sync-connect-plan-todos.ps1 -UpdatePlan` (set `status: completed` when repo checks pass). See `.cursor/rules/connect-plan-sync.mdc`.

## What I need from you (no secrets)
- Your **Supabase Project Ref** (the `YOUR_PROJECT_REF` part of `https://YOUR_PROJECT_REF.supabase.co`).
- Your intended **Cloudflare Pages project name** (or what you want it to be), so we can predict the Pages URL(s) to allowlist.

## What you will NOT paste here (secrets)
- Supabase **Anon key** (and any Service Role key if you later choose to use it).
- Cloudflare API tokens.

## Step 1 — Deploy the Supabase schema
- Open Supabase dashboard → your project → **SQL Editor**.
- Run the contents of `[supabase_schema.sql](C:/Users/admin/Desktop/wastewater_dashboard/supabase_schema.sql)`.
- Verify the tables used by the Worker exist (at minimum): `measurements`, `alerts`, `plants`, `parameters`, `standards`.

## Step 2 — Decide auth model (matches current Worker code)
- The Worker uses `Authorization: Bearer <access_token>` and calls `supabase.auth.getUser(token)`.
- That means the PWA must authenticate with Supabase and send the user access token on each API request.
- Keep using the **Anon key** in both Worker and PWA (current code expects that).

## Step 3 — Configure Cloudflare Worker env vars
These are the vars the repo expects:
- In `[api/wrangler.toml](C:/Users/admin/Desktop/wastewater_dashboard/api/wrangler.toml)`:
  - `SUPABASE_URL` (non-secret)
  - `ALLOWED_ORIGINS` (comma-separated)
- In Worker **secrets** (set via Wrangler CLI, not committed):
  - `SUPABASE_ANON_KEY`

Source of truth in the code:
- Worker reads `c.env.SUPABASE_URL`, `c.env.SUPABASE_ANON_KEY`, `c.env.ALLOWED_ORIGINS` in `[api/src/index.js](C:/Users/admin/Desktop/wastewater_dashboard/api/src/index.js)`.
- Local dev format is shown in `[api/.dev.vars.example](C:/Users/admin/Desktop/wastewater_dashboard/api/.dev.vars.example)`.

Default `ALLOWED_ORIGINS` to start with:
- `http://localhost:5173,http://127.0.0.1:5173,https://<your-pages-project>.pages.dev`

## Step 4 — Deploy the Worker locally with Wrangler
- From the `api/` folder:
  - Login to Cloudflare via Wrangler
  - Set `SUPABASE_ANON_KEY` as a Worker secret
  - Deploy the Worker
- After deploy, confirm the Worker health endpoint `/` returns `supabase_configured: true`.

## Step 5 — Configure the React PWA env vars
The repo’s example env file is `[frontend/.env.example](C:/Users/admin/Desktop/wastewater_dashboard/frontend/.env.example)`.
Set (do not commit real keys):
- `VITE_SUPABASE_URL` = your Supabase URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
- `VITE_API_URL` = your deployed Worker base URL (e.g. `https://wastewater-api.<subdomain>.workers.dev`)

## Step 6 — RLS + policies (required for real security)
- After schema deploy, add Row Level Security policies so that authenticated users can only:
  - insert their own measurements (`operator_id = auth.uid()`)
  - read appropriate data (start simple: same-tenant once you wire companies/plants; or temporarily allow read for authenticated users only)
- Validate by calling Worker endpoints with and without tokens.

## Step 7 — Smoke test checklist
- Register/login via Worker (`POST /auth/register`, `POST /auth/login`).
- Use returned `access_token` to call:
  - `GET /plants`
  - `POST /measurements`
  - `GET /measurements`
  - `GET /alerts`

## Files involved
- `[api/wrangler.toml](C:/Users/admin/Desktop/wastewater_dashboard/api/wrangler.toml)`
- `[api/.dev.vars.example](C:/Users/admin/Desktop/wastewater_dashboard/api/.dev.vars.example)`
- `[api/src/index.js](C:/Users/admin/Desktop/wastewater_dashboard/api/src/index.js)`
- `[frontend/.env.example](C:/Users/admin/Desktop/wastewater_dashboard/frontend/.env.example)`
- `[supabase_schema.sql](C:/Users/admin/Desktop/wastewater_dashboard/supabase_schema.sql)`