# Progress Summary — Wastewater Monitoring System

**Last updated:** April 10, 2026  

**Canonical status & next steps:** [`PROJECT_PLAN.md`](PROJECT_PLAN.md) · **Milestones & technical reference:** [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md)

---

## What works (local / LAN)

- **AquaDash** (Flask): dashboard, reports, exports (PDF with charts, CSV), alerts, settings.
- **React PWA**: login, dashboard, input, reports, alerts, settings (admin), offline queue, camera capture in UI; talks to Flask with session cookies.
- **LAN testing:** run the Vite dev server and open the app from another device on the same network (use your PC’s LAN IP, e.g. `http://192.168.x.x:5173`). Ensure Flask listens on `0.0.0.0:5000` if the phone must reach the API; adjust Windows firewall if needed.
- **Dev-only note:** avoid shipping wide-open CORS or default dev credentials to production.

---

## Notable fixes & features (April 2026 sessions)

- Auth: CORS + `SameSite` cookie behavior aligned for API vs browser; login/logout support JSON and form posts; clearer API vs HTML detection.
- AquaDash: all nine parameters, charts, KPIs, influent/effluent views, alerts.
- Settings: users, parameters/standards, data tools, report settings (including schedule UI).
- API examples: `GET/POST /api/users`, `DELETE /api/users/<id>`, `GET /api/parameters`, `PUT /api/parameters/<name>`.
- Exports: date ranges, matplotlib trends in PDF, CSV headers/metadata.
- Legacy `app/routes.py` removed in favor of `routes_refactored.py`.

---

## Architecture (one line)

**Today:** Flask + SQLite + React PWA. **Target:** Supabase + Cloudflare Workers + Supabase Auth — code and guides exist; **deploy and cutover are outstanding.**

---

## Component checklist

| Component | Notes |
|-----------|--------|
| Flask backend | Operational for core features |
| React PWA | Feature-complete vs Flask API |
| Supabase | Schema designed; project deploy pending |
| Workers `api/` | Coded; deploy pending |
| Sheets backup | Guide only |
| Mobile / PWA hardening | Production build + real-device pass still recommended |

---

## Technical debt (short)

- Tighten TypeScript types where still loose.
- Camera + image upload path fully validated against production storage.
- Run E2E and mobile/offline tests from `PWA_TESTING_GUIDE.md`.
- Complete cloud migration (see `PROJECT_PLAN.md` success metrics).

---

## Migration success (target stack)

Track these as **unchecked until done** (same list as `PROJECT_PLAN.md`):

1. Supabase live (auth + RLS + storage as needed)  
2. Workers deployed and callable from the PWA  
3. Frontend on Supabase Auth + Workers (not only Flask)  
4. SQLite → Postgres migration validated  
5. Real-device PWA verification  
6. Google Sheets backup implemented  
