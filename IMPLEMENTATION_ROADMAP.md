# Wastewater Monitoring System — Implementation Roadmap

**Companion doc:** Use [`PROJECT_PLAN.md`](PROJECT_PLAN.md) for narrative status, percentages, and week-by-week priorities. This file is a **milestone checklist** plus a short **technical reference**.

**Last updated:** April 10, 2026

---

## Snapshot

| Area | Status |
|------|--------|
| Flask + SQLite + AquaDash | Operational |
| React PWA + Flask API | Operational (local / LAN) |
| Supabase schema & guides | Designed; **project not deployed** |
| Cloudflare Workers API | Coded; **not deployed** |
| Auth | Flask-Login in use; **Supabase Auth migration pending** |
| Google Sheets backup | Guide only; **not implemented** |

---

## Milestone 0 — Foundation *(complete)*

- [x] Flask/SQLite: 9 parameters, services, models, refactored routes
- [x] `supabase_schema.sql` + `SUPABASE_SETUP_GUIDE.md`
- [x] `api/` Workers skeleton + `CLOUDFLARE_DEPLOYMENT_GUIDE.md`
- [x] React + Vite PWA, Dexie offline, core dependencies
- [ ] **Next:** Create Supabase project, apply schema, RLS, storage buckets
- [ ] **Next:** Deploy Workers; add production secrets

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

## Milestone 3 — Local integration *(complete)*

- [x] `frontend/src/services/api.ts` + Flask session auth
- [x] Deployment guides: Supabase, Cloudflare, PWA testing, Sheets backup
- [x] Env templates (`frontend`, `api/wrangler.toml`); **no production secrets in repo**
- [x] End-to-end on **local** stack

**Not done (cloud):**

- [ ] Deploy Supabase + migrate SQLite → Postgres
- [ ] Deploy Workers; point PWA to production API
- [ ] Supabase Auth replacing Flask-Login for the PWA
- [ ] Implement Sheets backup

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

### Workers API (intended)

```
GET/POST   /api/measurements  (+ /:id)
GET        /api/alerts
POST       /api/alerts/resolve/:id
GET/POST   /api/reports/generate, /api/reports/schedule
POST       /api/backup/to-sheets
```

### Frontend layout *(implemented)*

`frontend/src`: `pages/`, `components/`, `services/api.ts`, `services/offline/`, `contexts/`

---

## Quality gates *(not met until cloud migration is done)*

- [ ] RLS and auth tested; no cross-tenant leaks
- [ ] PWA: install + camera + offline sync on real devices
- [ ] Reasonable load times and error handling in production

---

## Risks *(short)*

- Free-tier limits (Supabase/Workers) — monitor usage
- Offline conflicts — design exists; validate under real usage
- Camera behavior varies by browser/OS — test on target phones

---

## Revision history

- **2026-04-10:** Consolidated duplicate “Phase 5” sections; fixed contradictory “done/pending” checkmarks; aligned with `PROJECT_PLAN.md`; removed stale dated “today” block.
- **2026-04-07:** Prior version (phase numbering overlapped; some items marked done while text said pending).
