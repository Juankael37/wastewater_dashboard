
# Wastewater Treatment Plant Monitoring System

## Project Overview

A full‑stack web application for monitoring wastewater treatment plants. Operators input influent and effluent data via a mobile app (offline‑capable), which syncs to the cloud. The system generates automated reports, provides a dashboard for visualization, and supports multi‑tenant architecture for selling to multiple companies.

**Target Deployment:** Cloudflare + Supabase (zero‑cost approach)

## Two Interfaces

### 1. AquaDash (Dark Theme) - `localhost:5000`
- **Type**: Flask backend HTML templates (server-rendered)
- **Users**: Clients/Owners & Admins
- **Purpose**: Monitoring dashboard, reports, and system settings
- **Features**: Dashboard, Reports, Alerts, Settings (admin-only)

### 2. Wastewater Monitor (Light Theme) - `localhost:5173`
- **Type**: React PWA Frontend (client-side)
- **Users**: Operators & Admins
- **Purpose**: Data input and monitoring
- **Features**: Dashboard, Input Data, Alerts

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

## Key Constraints
- Zero‑cost deployment (Cloudflare + Supabase)
- Offline‑capable mobile app
- Real‑time validation
- Email automation with images
- Google Sheets backup
- Camera integration per parameter