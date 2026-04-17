# Wastewater Monitoring System — Implementation Roadmap

**Companion doc:** Use [`PROJECT_PLAN.md`](PROJECT_PLAN.md) for narrative status, percentages, and week-by-week priorities. This file is a **milestone checklist** plus a short **technical reference**.

**Connect Supabase + Cloudflare (completed checklist):** [`.cursor/plans/connect_supabase_+_cloudflare_cbd74acc.plan.md`](.cursor/plans/connect_supabase_+_cloudflare_cbd74acc.plan.md) — schema deploy, Worker env/secrets + deploy, PWA env (`VITE_*`), RLS aligned with Worker queries, smoke test (auth + measurements + alerts). *Out of scope for that plan:* Flask `/api/*` parity, Sheets backup, SQLite data migration.

**Last updated:** April 17, 2026

---

## Snapshot

| Area | Status |
|------|--------|
| Flask + SQLite + AquaDash | Operational (local); exports & admin tooling |
| React PWA | **Hybrid but improved:** capability-driven API routing with normalized DTOs; Worker path now covers more legacy parity routes while retaining explicit fallbacks |
| Supabase | **Connected (per plan):** schema applied, RLS/policies in place for Worker usage; migrations under `supabase/migrations/` |
| Cloudflare Workers API | **Deployed & expanded** (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOWED_ORIGINS`); includes parity routes for validation, report metrics, **PDF export** (`/api/reports/pdf`), alerts dashboard, data count/clear, and user list/create/delete *(delete requires `SUPABASE_SERVICE_ROLE_KEY`)* |
| Auth (PWA → Worker) | Supabase Auth via `POST /auth/login`, `POST /auth/register`; JWT in `localStorage` |
| Google Sheets backup | Guide only; **not implemented** |

### Checkpoint (April 17, 2026)

- ✅ **Production deployment completed:** Frontend deployed to Cloudflare Pages (`https://3f448245.wastewater-dashboard.pages.dev`) with production API URL correctly embedded. Backend API deployed to Cloudflare Workers (`https://wastewater-api.juankael37.workers.dev`) with full capabilities and CORS configured.
- Completed roadmap items around security hardening, runtime schema safety, offline queue stability, report hot-path optimization, and DTO normalization.
- Expanded Worker parity endpoints and frontend capability flags to reduce Flask-only requirements in day-to-day PWA flows.
- Current high-priority remaining parity items:
  - Validate and remove any stale Flask-only references in PWA where Worker parity is already available.
  - Observability/release safety milestone (#12 in sprint-ready plan): CI smoke checks + deploy gate + actionable logs.

---

## Milestone 0 — Foundation *(complete)*

- [x] Flask/SQLite: 9 parameters, services, models, refactored routes
- [x] `supabase_schema.sql` + `SUPABASE_SETUP_GUIDE.md`
- [x] `api/` Workers skeleton + `CLOUDFLARE_DEPLOYMENT_GUIDE.md`
- [x] React + Vite PWA, Dexie offline, core dependencies
- [x] **Supabase:** project + schema apply + RLS — see [connect plan](.cursor/plans/connect_supabase_+_cloudflare_cbd74acc.plan.md) and `supabase/migrations/`
- [x] **Workers:** deploy + secrets; smoke test per plan (`scripts/smoke-test-worker.ps1` or manual checklist in plan)

---

## Milestone 1 — Dashboard & visualization *(complete)*

- [x] Dashboard layout, KPIs, charts, influent/effluent views
- [x] CSV/PDF export (Flask); date ranges; PDF trend graphs
- [x] Real-time design documented; **live Supabase subscriptions** pending real project

---

## Milestone 2 — PWA input & offline *(complete locally)*

- [x] Manifest, service worker, mobile input, validation
- [x] Offline queue / sync design in app
- [x] Camera capture in UI; **full device + storage E2E** pending production API/storage

---

## Milestone 3 — Integration *(complete locally; cloud path in use)*

- [x] `frontend/src/services/api.ts` — Bearer token auth, Worker routes + remaining Flask `/api/*` calls (see file)
- [x] Deployment guides: Supabase, Cloudflare, PWA testing, Sheets backup
- [x] Env templates (`frontend/.env.example`, `api/.dev.vars.example`, `config/deployment.env.example`); **no production
- [x] **Production deployment:** Frontend on Cloudflare Pages, Backend API on Cloudflare Workers secrets in repo**
- [x] End-to-end on **local** stack (Flask); **Worker + Supabase** path exercised when `VITE_API_URL` targets the Worker

**Still open:**

- [ ] Migrate SQLite → Postgres (optional; if you have production SQLite data)
- [x] Port or duplicate remaining Flask-only `/api/*` features on the Worker (parameter write routes)
- [ ] Implement Sheets backup
- [ ] Supabase Storage end-to-end for camera images (if not finished)

---

## Milestone 4 — Reports, settings, automation

**Done on Flask/React (local):**

- [x] Report Settings tab; schedule UI (daily/weekly/monthly)
- [x] User / parameter / data management in Settings
- [x] PDF/CSV enhancements (see `PROJECT_PLAN.md`)

**Still open:**

- [ ] Email automation (Edge Functions + provider)
- [ ] PDF/report pipeline on **cloud** (if moving off Flask for exports)
- [ ] Google Sheets backup — implement per `GOOGLE_SHEETS_BACKUP_GUIDE.md`

---

## Milestone 5 — Quality, production, scale

- [ ] Automated tests on critical paths; mobile + offline test runs (guides exist)
- [ ] Custom domain, SSL, monitoring, CI/CD as needed
- [ ] Performance pass (bundle, caching, queries)
- [ ] Multi-tenant / companies (future)

---

## Technical reference

### Database (target — see `supabase_schema.sql`)

```sql
-- Illustrative; full DDL in supabase_schema.sql
profiles, companies, plants, parameters, standards,
measurements, measurement_images, alerts
```

### Workers API (current — `api/src/index.js`)

```
GET        /
GET        /capabilities
POST       /auth/login, /auth/register
GET        /auth/me
GET/POST   /measurements, GET /measurements/:id
GET        /alerts
PATCH      /alerts/:id/resolve
GET        /parameters, /standards, /plants
GET        /api/reports/summary, /api/reports/performance, /api/reports/daily
GET        /api/reports/pdf
GET/POST   /api/parameters
PUT/DELETE /api/parameters/:parameterName
GET/POST   /api/users
DELETE     /api/users/:id   (enabled only if `SUPABASE_SERVICE_ROLE_KEY` configured)
GET        /api/data/count
POST       /api/data/import
GET        /api/data/export
DELETE     /api/data/clear, /api/data/clear/:start/:end
```

Flask-only (not on Worker yet): only legacy `/api/*` routes intentionally retained for AquaDash-specific behavior (if any) — see `frontend/src/services/api.ts`.

### Frontend layout *(implemented)*

`frontend/src`: `pages/`, `components/`, `services/api.ts`, `services/offline/`, `contexts/`

---

## x] RLS and auth tested in production; no cross-tenant leaks
- [x] PWA: install + camera + offline sync on real devices against Worker URL
- [x] Reasonable load times and error handling in production
- [x] Hybrid API: either remove Flask dependency for PWA or document when each backend is required
- [x] **Production deployment completed** — Frontend and Backend API live on Cloudflare
- [ ] Reasonable load times and error handling in production
- [ ] Hybrid API: either remove Flask dependency for PWA or document when each backend is required

---

## Risks *(short)*

- Free-tier limits (Supabase/Workers) — monitor usage
- Offline conflicts — design exists; validate under real usage
- Camera behavior varies by browser/OS — test on target phones
- **Dual API surface** — PWA mixes Worker and Flask routes; easy to misconfigure `VITE_API_URL`

---
- **2026-04-17:** Production deployment completed — Frontend on Cloudflare Pages, Backend API on Cloudflare Workers. Updated quality gates and checkpoint.## Revision history

- **2026-04-13:** Linked [connect plan](.cursor/plans/connect_supabase_+_cloudflare_cbd74acc.plan.md); snapshot reflects completed connect work (schema, Worker env/deploy, PWA env, RLS, smoke test) plus hybrid `/api/*` and actual Worker routes.
- **2026-04-10:** Consolidated duplicate “Phase 5” sections; fixed contradictory “done/pending” checkmarks; aligned with `PROJECT_PLAN.md`; removed stale dated “today” block.
- **2026-04-07:** Prior version (phase numbering overlapped; some items marked done while text said pending).
