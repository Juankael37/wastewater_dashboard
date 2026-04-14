# Wastewater Monitoring System — Implementation Roadmap

**Companion doc:** Use [`project_plan.md`](project_plan.md) for narrative status, percentages, and week-by-week priorities. This file is a **milestone checklist** plus a short **technical reference**.

**Connect Supabase + Cloudflare (completed checklist):** [`.cursor/plans/connect_supabase_+_cloudflare_cbd74acc.plan.md`](.cursor/plans/connect_supabase_+_cloudflare_cbd74acc.plan.md) — schema deploy, Worker env/secrets + deploy, PWA env (`VITE_*`), RLS aligned with Worker queries, smoke test (auth + measurements + alerts). *Out of scope for that plan:* Flask `/api/*` parity, Sheets backup, SQLite data migration.

**Last updated:** April 13, 2026

---

## Snapshot

| Area | Status |
|------|--------|
| Flask + SQLite + AquaDash | Operational (local); exports & admin tooling |
| React PWA | **Hybrid:** Worker base URL (`VITE_API_URL`) for auth, measurements, plants, parameters, standards, alerts; some calls still use Flask-style `/api/*` paths (validation, reports, data tools) — point `VITE_API_URL` at Flask (`:5000`) for full legacy behavior, or Workers for cloud core flows |
| Supabase | **Connected (per plan):** schema applied, RLS/policies in place for Worker usage; migrations under `supabase/migrations/` |
| Cloudflare Workers API | **Deployed & configured** (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOWED_ORIGINS`); routes in `api/src/index.js` |
| Auth (PWA → Worker) | Supabase Auth via `POST /auth/login`, `POST /auth/register`; JWT in `localStorage` |
| Google Sheets backup | Guide only; **not implemented** |

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
- [x] Env templates (`frontend/.env.example`, `api/.dev.vars.example`, `config/deployment.env.example`); **no production secrets in repo**
- [x] End-to-end on **local** stack (Flask); **Worker + Supabase** path exercised when `VITE_API_URL` targets the Worker

**Still open:**

- [ ] Migrate SQLite → Postgres (optional; if you have production SQLite data)
- [ ] Port or duplicate Flask-only `/api/*` features on the Worker (or document dual-backend dev)
- [ ] Implement Sheets backup
- [ ] Supabase Storage end-to-end for camera images (if not finished)

---

## Milestone 4 — Reports, settings, automation

**Done on Flask/React (local):**

- [x] Report Settings tab; schedule UI (daily/weekly/monthly)
- [x] User / parameter / data management in Settings
- [x] PDF/CSV enhancements (see `project_plan.md`)

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
POST       /auth/login, /auth/register
GET/POST   /measurements, GET /measurements/:id
GET        /alerts
PATCH      /alerts/:id/resolve
GET        /parameters, /standards, /plants
```

Flask-only (not on Worker yet): `/api/validation/check`, `/api/reports/*`, `/api/data/*`, parts of alerts dashboard — see `frontend/src/services/api.ts`.

### Frontend layout *(implemented)*

`frontend/src`: `pages/`, `components/`, `services/api.ts`, `services/offline/`, `contexts/`

---

## Quality gates

- [ ] RLS and auth tested in production; no cross-tenant leaks
- [ ] PWA: install + camera + offline sync on real devices against Worker URL
- [ ] Reasonable load times and error handling in production
- [ ] Hybrid API: either remove Flask dependency for PWA or document when each backend is required

---

## Risks *(short)*

- Free-tier limits (Supabase/Workers) — monitor usage
- Offline conflicts — design exists; validate under real usage
- Camera behavior varies by browser/OS — test on target phones
- **Dual API surface** — PWA mixes Worker and Flask routes; easy to misconfigure `VITE_API_URL`

---

## Revision history

- **2026-04-13:** Linked [connect plan](.cursor/plans/connect_supabase_+_cloudflare_cbd74acc.plan.md); snapshot reflects completed connect work (schema, Worker env/deploy, PWA env, RLS, smoke test) plus hybrid `/api/*` and actual Worker routes.
- **2026-04-10:** Consolidated duplicate “Phase 5” sections; fixed contradictory “done/pending” checkmarks; aligned with `project_plan.md`; removed stale dated “today” block.
- **2026-04-07:** Prior version (phase numbering overlapped; some items marked done while text said pending).
