
# Wastewater Treatment Plant Monitoring System

## Project Overview

A full‑stack web application for monitoring wastewater treatment plants. Operators input influent and effluent data via a mobile app (offline‑capable), which syncs to the cloud. The system generates automated reports, provides a dashboard for visualization, and supports multi‑tenant architecture for selling to multiple companies.

**Target Deployment:** Cloudflare + Supabase (zero‑cost approach)

**Implementation status:** [`PROJECT_PLAN.md`](PROJECT_PLAN.md), [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md), and the completed [Connect Supabase + Cloudflare](.cursor/plans/connect_supabase_+_cloudflare_cbd74acc.plan.md) checklist (schema, Worker, PWA env, RLS, smoke test). Broader backlog: hybrid API parity, Sheets backup, optional data migration.

## Two Interfaces

### 1. AquaDash (Dark Theme) - `/login/aquadash`
- **Type**: React SPA route inside the PWA (dark theme, teal accent)
- **Production URL**: `https://wastewater-dashboard.pages.dev/login/aquadash`
- **Users**: Clients/Owners & Admins
- **Purpose**: Monitoring dashboard, reports, alerts, settings
- **Features**: Dashboard, Reports, Alerts, Settings (admin-only)
- **Status**: ✅ **LIVE on Cloudflare Pages** — login working

### 2. Operator Portal (Light Theme) - `/login/operator`
- **Type**: React PWA Frontend (client-side, light theme, blue accent)
- **Production URL**: `https://wastewater-dashboard.pages.dev/login/operator`
- **Users**: Operators
- **Purpose**: Data input and monitoring
- **Features**: Data input form, offline PWA, camera integration
- **Status**: ✅ **LIVE on Cloudflare Pages** — login working

> **Note:** The Flask app (`app/`) remains in the repo for local use and legacy `/api/*` routes but is **not deployed**. Both user-facing portals are served from the React PWA on Cloudflare Pages.

## Tech Stack

| Component          | Technology                         |
|--------------------|------------------------------------|
| Frontend (Web)     | React (PWA)                        |
| Backend            | Cloudflare Workers / Pages         |
| Database           | Supabase (PostgreSQL)              |
| Auth               | Supabase Auth                      |
| Storage            | Supabase Storage (for images)      |
| Mobile App         | PWA (installable)                  |
| Backup             | Google Sheets API                  |

## User Roles & Access

| Role | AquaDash (5000) | React PWA (5173) |
|------|-----------------|------------------|
| **Admin** | ✅ View | ✅ Full access (Dashboard, Input, Reports, Alerts, Settings) |
| **Operator** | ✅ View | ✅ Data input & monitoring (no Settings) |
| **Client/Owner** | ✅ View-only | ❌ No access |

- **Admin** – Full control: manage users, parameters, settings, edit/delete data, generate reports.
- **Operator** – Input data via mobile app, view summary of submissions.
- **Client/Owner** – View-only access to monitoring dashboard.

## Web App Features

### Dashboard
- Display recent data inputs (last 24 hours)
- Show both influent and effluent data side‑by‑side
- Visual indicators for parameters exceeding standards

### Graphs Page
- Individual graphs for each parameter over time
- Compare influent vs. effluent trends

### Settings (Admin Only)
- User Management – add/remove operators (credentials for mobile app login)
- Parameter Management – add/remove parameters displayed in the system
- Unit Management – define/edit units for each parameter
- Data Management – edit or delete operator‑submitted data
- Manual Input – allow admin to input data directly

### Reports
- Normal users can manually download reports
- Admin can select which parameters to include
- Reports include images uploaded by operators
- Schedule automated emails: Daily, Weekly, Monthly

## Data Parameters & Standards

### Effluent Standards (Class C Water Body)

| Parameter | Standard Limit | Unit  |
|-----------|----------------|-------|
| Ammonia   | 0.5            | mg/L  |
| Nitrate   | 14             | mg/L  |
| Phosphate | 1              | mg/L  |
| COD       | 100            | mg/L  |
| BOD       | 50             | mg/L  |
| TSS       | 100            | mg/L  |
| pH        | 6.0 – 9.5      | –     |

### Initial Parameters
- Ammonia, Nitrate, Phosphate, COD, BOD, TSS, Influent (Flow), pH, Temperature

### Validation Rules (Input Warnings)
Real‑time warnings when values exceed valid ranges (see detailed table in original spec).

## Mobile App Features (PWA / Installable)

- **Input Form:** plant/location selection, real‑time validation, camera integration for COD, BOD, Ammonia, Nitrate, Phosphate.
- **Data Handling:** automatically attach operator name and timestamp, show submission summary.
- **Offline Mode:** save data locally when offline, auto‑sync to cloud on reconnection.

## Data Backup
- All submitted data automatically backed up to Google Sheets, including timestamp, operator info, and all parameter values.

## Future Modifications (Multi‑Tenant)
- Multiple plants per company, Company Admin per company, Super Admin for platform management.

## Development Workflow
- Refactor before session end.
- **Save to GitHub** – initiate git commit and push.

## Checkpoint (April 15, 2026)

- Completed: security hardening, RBAC/CORS fixes, offline sync stabilization, report hot-path optimization, schema-mutation cleanup, and DTO normalization.
- In progress: Worker parity migration for legacy Flask `/api/*` contracts used by the PWA.
- Worker parity now includes: validation check, report metric endpoints, **PDF export** (`/api/reports/pdf`), alerts dashboard summary, data count/clear, and user list/create/**delete** (delete is enabled only when Worker has `SUPABASE_SERVICE_ROLE_KEY` configured; admin accounts are protected from deletion).
- Release safety started: structured JSON request/error logs in Worker, updated smoke test, GitHub Actions smoke workflow, and local predeploy gate script.
- Remaining focus: Google Sheets backup implementation, real-device PWA testing (install/camera/offline), and optional SQLite historical data migration validation. Worker parity now covers Settings parameter-management APIs and data import/export.

## Checkpoint (April 25, 2026) — Production Deployment Stabilized ✅

- **Both portals now LIVE on Cloudflare Pages** at `wastewater-dashboard.pages.dev`
  - `/login/aquadash` — AquaDash dark portal (Client & Admin) ✅
  - `/login/operator` — Operator light portal ✅
  - Login working on both; switch links between portals functional
- **CORS wildcard fix deployed** to `wastewater-api.juankael37.workers.dev`
  - Added `matchesWildcard()` helper — `https://*.pages.dev` now correctly covers all preview/production URLs
- **Production deployment pipeline fixed**
  - Cloudflare Pages project production branch set to `main`
  - GitHub Actions (`deploy-frontend.yml`) uses `wrangler pages deploy --branch=main` → advances production alias
  - `VITE_API_URL` typo (`juanke37` vs `juankael37`) fixed — workflow no longer overrides `.env.production`
  - Vite reads `frontend/.env.production` directly for all build-time env vars
- **Removed stale debug telemetry** from `frontend/src/services/api.ts` (3 `fetch` calls to `127.0.0.1:7809`)
- **Flask app NOT deployed** — runs locally only; not needed for cloud production path

## Key Constraints
- Zero‑cost deployment (Cloudflare + Supabase)
- Offline‑capable mobile app
- Real‑time validation
- Email automation with images
- Google Sheets backup
- Camera integration per parameter