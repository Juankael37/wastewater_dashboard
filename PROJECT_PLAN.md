# Wastewater Monitoring System – Project Status & Migration Plan

**Also see:** [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md) (milestone checklist + API/schema reference) · [`PROGRESS_SUMMARY.md`](PROGRESS_SUMMARY.md) (recent session notes) · **[Connect Supabase + Cloudflare](.cursor/plans/connect_supabase_+_cloudflare_cbd74acc.plan.md)** (completed: schema deploy, Worker vars/secrets + deploy, PWA env, RLS, smoke test)

### Connect plan vs rest of migration
The [connect plan](.cursor/plans/connect_supabase_+_cloudflare_cbd74acc.plan.md) scoped **wiring** this repo to Supabase + a deployed Worker + PWA env + minimal RLS + E2E checks. **Outside that plan** (still tracked below): Flask `/api/*` parity for some PWA screens, optional SQLite → Postgres migration, Google Sheets backup, email automation, multi-tenant, full camera→Storage QA.

## 📊 Current Implementation Status (April 15, 2026)

### 🔖 Checkpoint — April 15, 2026

**Completed in this checkpoint**
- Security hardening completed: env-based secrets/bootstrap admin, RBAC enforcement (Flask + Worker + RLS), and strict CORS behavior.
- Frontend/Worker contract stabilization completed: capability endpoints + capability-driven gating in `frontend/src/services/api.ts` and Settings UI.
- Offline sync reliability improvements completed: real API replay for queued creates, single-flight queue processing, delete queue bug fix.
- Reporting/performance improvements completed: lightweight CSV export path, report summary/performance caching, heavy PDF kept on dedicated endpoint.
- Schema/runtime safety completed: removed runtime `ALTER TABLE` behavior in request handlers and added migration script for legacy SQLite `users.role`.
- DTO normalization completed for dashboard/alerts via centralized mapping in service layer.

**In progress**
- Worker parity expansion for legacy `/api/*` routes (major item #11) is actively in progress.
- Worker now supports compatibility endpoints for validation, report metrics (`/api/reports/*` non-PDF), alerts dashboard, data count/clear, and user list/create.

**Remaining next actions / blockers**
- Worker user delete parity remains intentionally disabled (capability flag false) pending safe account lifecycle strategy.
- Worker PDF parity remains open (`supportsLegacyReportPdfApi=false`); choose implementation strategy or keep explicit non-support.
- Observability and release safety rails (plan item #12) are not started yet.

### ✅ Completed Features (Enhanced Legacy + New Infrastructure)

#### Backend (Flask + SQLite - Enhanced)
- **Basic Web Dashboard** with Chart.js visualizations
- **Input System** for **ALL 9 parameters** (pH, COD, BOD, TSS, Ammonia, Nitrate, Phosphate, Temperature, Flow)
- **Reports Page** with summary metrics and compliance rate
- **PDF Export** functionality using ReportLab
- **Authentication System** with Flask-Login (✅ Working with session cookies)
- **Standards Database** with UI for managing water quality standards (all 9 parameters)
- **Alert System** with comprehensive threshold checking for all parameters
- **Tailwind CSS UI** for responsive design
- **Service Layer Architecture**: Proper separation of concerns with models, services, and routes
- **Enhanced Database Schema**: Supports all parameters with proper normalization
- **Authentication Fix**: Resolved login issues with proper credential handling

#### Frontend (React PWA - Complete)
- **Mobile-optimized input forms** with real-time validation for all 9 parameters
- **Camera integration** for COD, BOD, Ammonia, Nitrate, Phosphate parameters
- **PWA features**: Manifest, service worker, offline capabilities
- **Complete page structure**: Login, Register, Dashboard, Input, Reports, Alerts, Settings
- **Offline capabilities**: IndexedDB with Dexie.js, background sync
- **API integration**: `frontend/src/services/api.ts` — Worker routes + remaining Flask `/api/*` where features are not ported yet
- **Authentication Flow**: Supabase Auth via Worker when `VITE_API_URL` points at the Worker (JWT in `localStorage`); Flask session path still available for AquaDash
- **Error Handling**: Enhanced error handling for authentication failures

#### Infrastructure (cloud path in repo)
- **Supabase schema** + migrations (`supabase_schema.sql`, `supabase/migrations/`)
- **Cloudflare Workers API** (`api/src/index.js`) — auth, measurements, plants, parameters, standards, alerts
- **Implementation guides** and env templates (`frontend/.env.example`, `api/.dev.vars.example`, `config/deployment.env.example`)

### ✅ Refactoring & Preparation Improvements (Completed)
- **Extended Database Schema**: Added support for Ammonia, Nitrate, Phosphate, Temperature, Flow parameters
- **Enhanced Models**: Updated Measurement model to handle all parameters
- **Improved Services**: ValidationService, AlertService, ReportService now support all parameters
- **Consolidated Architecture**: Clean separation between routes, services, and models
- **Fixed SQL Issues**: Resolved SQL query parameter binding problems
- **Comprehensive Testing**: All core functionality tested and verified
- **API Integration**: `frontend/src/services/api.ts` targets Worker + Supabase for core flows; Flask `/api/*` for legacy report/data routes
- **Deployment Guides**: Created comprehensive guides for Supabase, Cloudflare, PWA testing, and Google Sheets backup
- **Authentication Fix**: Resolved login issues with frontend API handling of Flask 302 redirects
- **Documentation**: Created `AUTHENTICATION_FIX.md` troubleshooting guide

### ⚠️ Remaining Migration Tasks
- **Feature parity**: Port or replace Flask-only `/api/*` usage in the PWA (validation, reports, data import/export) on the Worker — or run a documented dual-backend setup
- **Data Migration**: Optional — SQLite → Postgres if you need historical data in Supabase
- **Storage**: Supabase Storage wired for camera images end-to-end (verify uploads + RLS)
- **Backup / email**: Google Sheets backup; scheduled email reports (future)

## 🎯 Target Architecture (Zero-Cost Deployment)
- **Frontend**: React PWA with offline capabilities (✅ Complete)
- **Backend**: Cloudflare Worker (`api/`) for core API; Flask retained for AquaDash and legacy `/api/*` features
- **Database**: Supabase PostgreSQL with RLS (schema + migrations in repo; verify in project)
- **Auth**: Supabase Auth for PWA when using Worker URL
- **Storage**: Supabase Storage for parameter images (⚠️ finish E2E if not done)
- **Backup**: Google Sheets API integration (⚠️ Implementation guide created)
- **Email**: Supabase Edge Functions + Resend/SendGrid (📅 Future phase)

## 🔄 Migration Strategy - CURRENT STATUS

### Phase 0: Assessment & Planning ✅ COMPLETED
- [x] Analyze current implementation
- [x] Identify gaps vs target architecture
- [x] Create detailed migration roadmap (`IMPLEMENTATION_ROADMAP.md`)
- [x] Set up project structure and configuration files

### Phase 1: Database Migration (IN PROGRESS — cloud baseline done)
- [x] Design Supabase schema (PostgreSQL) - `supabase_schema.sql`
- [x] **Enhanced legacy SQLite database** with proper models
- [x] **Implemented data validation services**
- [x] **Created deployment guide** (`SUPABASE_SETUP_GUIDE.md`)
- [x] Create Supabase project and apply schema (per your deployment)
- [ ] Migrate existing data from SQLite to Supabase (optional)
- [x] Row Level Security (RLS) — policies/migrations in repo; **verify** in Supabase dashboard
- [ ] Set up storage buckets for images (if not complete)

### Phase 2: Backend API Migration (Worker live; extend as needed)
- [x] Create Cloudflare Workers API skeleton - `api/` directory
- [x] **Refactored Flask backend** with proper service layer
- [x] **Implemented authentication** with Flask-Login (AquaDash / Flask API)
- [x] **Built CRUD operations** for all entities via services
- [x] **Added validation and business logic** in services module
- [x] **Updated API to use environment variables**
- [x] **Created deployment guide** (`CLOUDFLARE_DEPLOYMENT_GUIDE.md`)
- [x] Deploy API to Cloudflare Workers (per your account)
- [ ] Extend Worker for remaining `/api/*` features used by the PWA, or keep Flask for those routes
- [ ] Set up monitoring and logging

### Phase 3: Frontend Rewrite (React PWA) ✅ COMPLETED
- [x] Set up React + Vite project with PWA configuration - `frontend/` directory
- [x] Implement authentication flows - `AuthContext.tsx` (Worker + Supabase JWT when using Worker `VITE_API_URL`)
- [x] **Built dashboard component** with all 9 parameters and charts - `DashboardPage.tsx`
- [x] **Created layout components** - Layout, Navigation, Header
- [x] **Implemented offline context** - `OfflineContext.tsx`
- [x] **Created mobile-optimized input forms** - `InputPage.tsx`
- [x] **Added camera integration** for parameter images
- [x] **Implemented API service layer** - `frontend/src/services/api.ts`
- [x] **Created PWA testing guide** (`PWA_TESTING_GUIDE.md`)
- [x] **Installed all dependencies** including `react-hot-toast`
- [x] **Built fully functional Settings page** - `SettingsPage.tsx` with user/parameter/data management

### Phase 4: Integration & deployment — **local complete**, **cloud path connected**
Local Flask + React integration is done. The PWA can use **Supabase + Workers** when `VITE_API_URL` points at the deployed Worker; some screens still call Flask `/api/*` routes.

- [x] Create API integration infrastructure
- [x] Develop comprehensive deployment guides
- [x] Update code for environment configuration
- [x] **Fix CORS and session cookie configuration**
- [x] **Authentication for Worker path (JWT + Bearer)**
- [x] **Enhance AquaDash dashboard with all 9 parameters**
- [x] **Build functional Settings page with user/parameter management**
- [x] **Add user management API endpoints** (Flask)
- [x] **Clean up legacy code files**
- [x] **Add export date range selection (Today, Week, Month, All)**
- [x] **Add PDF export with matplotlib trend graphs for all 9 parameters**
- [x] **Enhance CSV export with professional header and metadata**
- [x] Deploy Supabase database (your project)
- [x] Deploy Cloudflare Workers API (your account)
- [ ] Implement Google Sheets backup
- [ ] Close gaps: Worker vs Flask feature parity for PWA (see `IMPLEMENTATION_ROADMAP.md`)

### Phase 5: Advanced Features (UPCOMING)
- [ ] Implement Google Sheets backup (guide created)
- [ ] Add email automation (Daily/Weekly/Monthly reports)
- [ ] Build admin settings panel
- [ ] Add multi-tenant support
- [ ] Implement advanced reporting features

## 🚀 Current Progress & Next Steps

### ✅ Weeks 1-3: Foundation, Refactoring & Mobile Experience - COMPLETED
1. ✅ Set up Supabase schema design - `supabase_schema.sql`
2. ✅ Create Cloudflare Workers API skeleton - `api/` directory
3. ✅ Build React frontend skeleton with authentication - `frontend/` directory
4. ✅ **Refactored Flask app** with proper separation of concerns
   - Created `app/models/` with proper data models
   - Created `app/services/` with business logic
   - Refactored `app/routes_refactored.py` with clean API endpoints
5. ✅ **Implemented mobile PWA features**
   - Mobile-optimized input forms
   - Camera integration
   - Offline capabilities with IndexedDB
   - PWA manifest and service worker
6. ✅ **Created comprehensive implementation guides**
   - Supabase Setup Guide
   - Cloudflare Deployment Guide
   - PWA Testing Guide
   - Google Sheets Backup Guide
7. ✅ **Updated API integration**
   - Created `frontend/src/services/api.ts` (Worker + selective Flask `/api/*`)
   - AuthContext uses JWT/session from Worker login path
   - Enhanced error handling and TypeScript types

### 🔄 Week 4: Integration & Deployment — **mostly complete**; polish remains
1. **Supabase** — Confirm RLS, profiles, and storage match app usage.
2. **Workers** — Keep secrets and `ALLOWED_ORIGINS` aligned with Pages/Vite origins.
3. **Frontend** — Resolve hybrid API: either implement missing Worker routes or document `VITE_API_URL` = Flask for full legacy PWA features.
4. **Priority 4: Mobile PWA Testing** (1 hour)
   - Build production PWA
   - Test installation on mobile devices
   - Verify camera integration
   - Test offline functionality

5. **Priority 5: Google Sheets Backup** (2 hours)
   - Set up Google Cloud project and service account
   - Create spreadsheet and configure sharing
   - Implement backup function
   - Test data backup on measurement submission

### 📅 Weeks 5-6: Testing, Optimization & Launch - UPCOMING
1. Comprehensive testing (mobile devices, offline scenarios)
2. Performance optimization
3. Security hardening
4. User acceptance testing
5. Production launch
6. Monitoring setup
7. Documentation finalization

## 📋 Critical Decisions Made

1. **Migration Approach**: Incremental migration with dual architecture during transition
2. **Data Migration Strategy**: Manual migration with validation scripts
3. **Feature Priority**: Mobile PWA first, then advanced features
4. **Testing Strategy**: Comprehensive guides created for systematic testing

## 🛠️ Technical Implementation Status

### Frontend (React + TypeScript + Vite)
- **Status**: ✅ Complete and Functional
- **Dependencies**: All installed including Dexie, React Hook Form, Lucide Icons, Chart.js
- **PWA Configuration**: ✅ Complete with manifest and service worker
- **API Integration**: ✅ Worker + hybrid Flask routes (see `api.ts`)
- **Pages**: Dashboard (9 params + charts), Input, Reports, Alerts, Settings (users/params/data)

### Backend APIs (Flask + SQLite)
- **Flask API**: ✅ Fully Operational (localhost:5000)
- **Authentication**: ✅ Working with session cookies and CORS
- **User Management**: ✅ Create/delete users API
- **Parameter Management**: ✅ Get/update standards API
- **Data Management**: ✅ Clear data, get count API
- **Measurements**: ✅ CRUD operations for all 9 parameters
- **Cloudflare Workers API**: ✅ Core routes deployed (auth, measurements, plants, parameters, standards, alerts)

### Database
- **SQLite**: ✅ Enhanced with all 9 parameters, users, standards, alerts
- **Supabase PostgreSQL**: ✅ In use for Worker path; migrations in repo

### Two Interfaces
- **AquaDash** (localhost:5000): Dark theme for clients/owners - monitoring dashboard
- **React PWA** (localhost:5173): Light theme for operators/admins - data input and settings

## 📞 Support & Resources

### Implementation Guides Created
- `SUPABASE_SETUP_GUIDE.md` - Complete Supabase deployment instructions
- `CLOUDFLARE_DEPLOYMENT_GUIDE.md` - Cloudflare Workers deployment guide
- `PWA_TESTING_GUIDE.md` - Comprehensive PWA testing procedures
- `GOOGLE_SHEETS_BACKUP_GUIDE.md` - Google Sheets integration guide
- `AUTHENTICATION_FIX.md` - Authentication troubleshooting and fix guide

### External Resources
- Supabase Documentation: https://supabase.com/docs
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- PWA Resources: https://web.dev/progressive-web-apps/
- React Best Practices: https://reactjs.org/docs/getting-started.html

## 🎯 Success metrics (target stack: Cloudflare + Supabase)

Migration is complete when **all** of the following are true:

1. [x] Supabase database deployed with working authentication and RLS (verify policies in dashboard)
2. [x] Cloudflare Workers API operational and reachable from the PWA
3. [x] Frontend using production Worker API + Supabase Auth for core flows (JWT); Flask remains for AquaDash and some PWA `/api/*` features
4. [ ] Data migrated from SQLite to PostgreSQL with validation (if required)
5. [ ] Mobile PWA verified on real devices (install, camera, offline sync)
6. [ ] Google Sheets backup implemented and tested

## 📈 Project Health Status

- **Overall Progress**: Product feature-rich locally; **cloud operator path** live; **parity + backup + device QA** remain
- **Frontend**: Strong; resolve hybrid API for a single clear production story
- **Backend**: Flask complete for exports/admin; Worker covers core CRUD + auth
- **Documentation**: Roadmap/progress aligned as of April 2026
- **Testing**: Exercise smoke tests (`scripts/smoke-test-worker.ps1`) and `PWA_TESTING_GUIDE.md` on real devices

The system is fully functional with two interfaces:
1. **AquaDash** (Flask HTML templates) - Client/owner monitoring dashboard with export features
2. **React PWA** - Operator data input and settings; **Worker + Supabase** when configured

### Latest features (recent sessions):
- Worker + Supabase integration; RLS/migration artifacts in `supabase/migrations/`
- Export PDF with trend graphs for all 9 parameters (Flask / AquaDash)
- Report Settings tab in Settings page

**Next focus:** Google Sheets backup, optional SQLite migration, Worker parity for PWA-only Flask routes, production device testing.

## Sprint-ready execution plan (from analysis steps 1-3)

Numbered backlog below is ordered by priority and grouped as quick wins, medium improvements, and major refactors.

1. **Quick win (P0) — Remove hardcoded secrets/default credentials**
   - **Owner:** Backend
   - **Estimate:** 0.5 day
   - **Dependencies:** Access to runtime secret manager/env configuration
   - **Files:** `app/__init__.py`, `app/models/__init__.py`, `config/deployment.env.example`
   - **Change:** Replace hardcoded Flask secret and default admin bootstrap with environment-driven settings and secure bootstrap guards.
   - **Acceptance criteria:** No hardcoded secrets/credentials in repo; app fails fast when required secrets are missing in non-dev.

2. **Quick win (P0) — Enforce RBAC on destructive/admin APIs**
   - **Owner:** Backend
   - **Estimate:** 1 day
   - **Dependencies:** Role mapping agreement (`admin` vs Supabase roles)
   - **Files:** `app/routes_refactored.py`, `api/src/index.js`, `supabase/migrations/20260413120000_worker_seed_rls_and_profiles.sql`
   - **Change:** Add explicit server-side role checks for user management and data-clear endpoints in Flask and Worker; align with RLS.
   - **Acceptance criteria:** Non-admin users receive `403` for protected endpoints; admin flows still pass.

3. **Quick win (P0/P1) — Correct CORS behavior**
   - **Owner:** Backend/Platform
   - **Estimate:** 0.5 day
   - **Dependencies:** Final allowed origins list for each environment
   - **Files:** `api/src/index.js`, `app/__init__.py`, `api/.dev.vars.example`
   - **Change:** Reject unknown origins explicitly; remove fallback-to-first-origin behavior.
   - **Acceptance criteria:** Requests from unlisted origins are blocked; valid origins work across local/dev/prod.

4. **Quick win (P1) — Remove/gate unsupported legacy `/api/*` calls in PWA cloud mode**
   - **Owner:** Frontend
   - **Estimate:** 1 day
   - **Dependencies:** Backend capability map contract
   - **Files:** `frontend/src/services/api.ts`, `frontend/src/pages/settings/SettingsPage.tsx`
   - **Change:** Feature-flag Flask-only calls when running against Worker; gate UI actions based on backend capabilities.
   - **Acceptance criteria:** No runtime 404s from unsupported `/api/*` calls in Worker mode.

5. **Quick win (P1) — Fix offline delete/sync queue logic**
   - **Owner:** Frontend
   - **Estimate:** 1 day
   - **Dependencies:** Stable measurement API contract
   - **Files:** `frontend/src/services/offline/database.ts`, `frontend/src/contexts/OfflineContext.tsx`
   - **Change:** Read record before deletion, queue delete action correctly, and process sync queue with a single-flight guard.
   - **Acceptance criteria:** Offline create/update/delete actions replay correctly once online; no duplicate queue processing.

6. **Quick win (P1) — Add Worker contract smoke tests**
   - **Owner:** QA/Backend
   - **Estimate:** 1 day
   - **Dependencies:** Test credentials and environment URLs
   - **Files:** `scripts/smoke-test-worker.ps1`, `test_frontend_api.js` (or dedicated contract test file)
   - **Change:** Verify all endpoints used by frontend service layer, including role-restricted behavior.
   - **Acceptance criteria:** Smoke suite fails on contract drift and auth regressions.

7. **Medium improvement (P1) — Unify auth/session source of truth**
   - **Owner:** Backend + Frontend
   - **Estimate:** 1-2 days
   - **Dependencies:** Worker auth endpoint extension
   - **Files:** `api/src/index.js`, `frontend/src/services/api.ts`, `frontend/src/contexts/AuthContext.tsx`
   - **Change:** Add `/auth/me` on Worker and stop relying on decode-only JWT payload on frontend for identity state.
   - **Acceptance criteria:** Auth state is server-validated; expired/invalid tokens are handled consistently.

8. **Medium improvement (P1/P2) — Optimize report path**
   - **Owner:** Backend
   - **Estimate:** 2-3 days
   - **Dependencies:** Decision on async job mechanism
   - **Files:** `app/routes_refactored.py` and report service module(s)
   - **Change:** Split summary endpoints from heavy PDF generation; move heavy generation off hot request path.
   - **Acceptance criteria:** Report endpoints remain responsive under load; large export flow is stable.

9. **Medium improvement (P1/P2) — Move schema mutations to migrations only**
   - **Owner:** Backend/DB
   - **Estimate:** 1 day
   - **Dependencies:** Migration rollout procedure
   - **Files:** `app/routes_refactored.py`, migration files in `supabase/migrations` (or app migration system)
   - **Change:** Remove runtime schema-altering SQL from request handlers.
   - **Acceptance criteria:** No `ALTER TABLE` statements executed from runtime API handlers.

10. **Medium improvement (P2) — Normalize DTO contracts**
   - **Owner:** Frontend + Backend
   - **Estimate:** 1-2 days
   - **Dependencies:** Contract review between API/UI
   - **Files:** `api/src/index.js`, `frontend/src/services/api.ts`, `frontend/src/pages/dashboard/DashboardPage.tsx`, `frontend/src/pages/alerts/AlertsPage.tsx`
   - **Change:** Define canonical measurement/alert/parameter DTOs and centralize mapping in service layer.
   - **Acceptance criteria:** Pages consume typed normalized models with minimal per-page transformation.

11. **Major refactor (P1/P2) — Complete Worker parity and retire PWA dependence on Flask `/api/*`**
   - **Owner:** Backend + Frontend
   - **Estimate:** 1-2 sprints
   - **Dependencies:** Product decision on legacy AquaDash scope
   - **Files:** `api/src/index.js`, `frontend/src/services/api.ts`, affected `frontend/src/pages/*`
   - **Change:** Implement missing Worker endpoints and migrate frontend fully to Worker contracts.
   - **Acceptance criteria:** PWA can run fully against Worker + Supabase without Flask API dependency.

12. **Major refactor (P2) — Add observability and release safety**
   - **Owner:** Platform/Backend
   - **Estimate:** 1 sprint
   - **Dependencies:** CI/CD workflow updates
   - **Files:** `api/src/index.js`, CI workflow files, `scripts/smoke-test-worker.ps1`
   - **Change:** Add structured request/error logs, route-level metrics, pre-deploy smoke checks, and rollback checklist.
   - **Acceptance criteria:** Deployments include automated validation and actionable runtime diagnostics.