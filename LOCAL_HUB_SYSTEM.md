# Local Hub System - Implementation Plan

## Overview

A local "edge hub" system that allows phones to submit data to a laptop on the same network, even when offline. The laptop acts as a central collector that syncs to the cloud when online.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           LAPTOP (Hub)                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │ Flask App    │    │  SQLite DB   │    │  Background Sync Worker │  │
│  │ /hub/*       │───►│  (local)      │───►│  → Supabase every 60s  │  │
│  │ +QR Display  │    │  measurements │    │  (or manual trigger)   │  │
│  └──────────────┘    │  shifts       │    └──────────────────────────┘  │
│                      │  operators    │                                  │
│                      └──────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ▲
                        (local WiFi)
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                         PHONE (PWA)                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │ QR Scanner   │    │ Hub Mode     │    │  Offline Buffer          │  │
│  │ (local/cloud)│───►│ (submit data)│───►│  (IndexedDB)             │  │
│  │              │    │ + shift UI   │    │  (wifi gap protection)   │  │
│  └──────────────┘    └──────────────┘    └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Two QR Codes

| QR Code | URL | Use Case |
|---------|-----|----------|
| **Hub QR** | `http://<laptop-ip>:5000/hub/connect?token=<session>` | Phone connects to hub (offline-capable) |
| **Cloud QR** | `https://wastewater-api.juankael37.workers.dev/api/measurements` | Phone sends direct (requires internet) |

## Data Flow Scenarios

| Scenario | Flow |
|----------|------|
| Phone online + Cloud available | Phone → Cloud QR → Supabase (direct) |
| Phone offline + Hub online | Phone → Hub QR → Laptop SQLite → Background sync to Supabase |
| Phone offline + Hub offline | Phone → local buffer (IndexedDB) → wait for hub reconnection |
| Wifi drops mid-submission | Phone buffer → auto-retry when re-connected to hub WiFi |

## Database Schema (SQLite)

```sql
-- Hub operators (connected phones)
CREATE TABLE hub_operators (
  id INTEGER PRIMARY KEY,
  operator_id TEXT,
  operator_name TEXT,
  connected_at DATETIME,
  disconnected_at DATETIME,
  status TEXT DEFAULT 'connected'
);

-- Measurements from hub (before sync)
CREATE TABLE hub_measurements (
  id INTEGER PRIMARY KEY,
  operator_id TEXT,
  operator_name TEXT,
  shift_id INTEGER,
  plant_id TEXT,
  location TEXT,
  -- parameter fields: ph, cod, bod, tss, ammonia, nitrate, phosphate, temperature, flow
  -- image references
  created_at DATETIME,
  synced INTEGER DEFAULT 0
);

-- Sync status
CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY,
  last_sync_at DATETIME,
  status TEXT,
  records_synced INTEGER
);
```

## API Endpoints (Flask Hub)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/hub/start` | POST | Activate hub, generate session token |
| `/hub/stop` | POST | Deactivate hub |
| `/hub/status` | GET | Hub status, connected operators, pending count |
| `/hub/submit` | POST | Submit measurement to hub |
| `/hub/connect` | POST | Operator starts shift (scan QR) |
| `/hub/disconnect` | POST | Operator ends shift |
| `/hub/queue` | GET | List pending unsynced measurements |
| `/hub/sync` | POST | Trigger manual sync to Supabase |

## Shift Management

| Action | Trigger | Result |
|--------|---------|--------|
| **Connect** | Scan Hub QR | Record connected_at, show active shift |
| **Disconnect** | Click "End Shift" button | Record disconnected_at, log duration |
| **Auto-timeout** | No activity for 15 min | Auto-disconnect, notify operator |
| **Reconnect** | Scan QR again | New shift session |

## Offline Buffer (Phone)

- Store in IndexedDB with "pending" flag when wifi drops
- Auto-retry when reconnects to hub WiFi
- Show "offline buffer: X items" indicator
- No manual sync needed

## Background Sync (Laptop)

- **Interval:** Every 60 seconds (configurable)
- **Also:** Manual "Sync Now" button
- **Process:**
  1. Fetch unsynced hub_measurements (synced=0)
  2. POST each to Supabase
  3. On success, mark synced=1
  4. Log to sync_log

## Validation Strategy

- **Hub:** Basic validation (required fields, number formats, basic ranges)
- **Supabase sync:** Full compliance validation
- Quick feedback for operators, full validation at sync time

## Files to Create/Modify

| File | Description |
|------|-------------|
| `app/routes/hub.py` | New hub routes |
| `app/models/hub.py` | Hub models |
| `templates/hub.html` | QR display page |
| `frontend/src/pages/HubModePage.tsx` | Phone hub UI |
| `frontend/src/services/hubApi.ts` | Hub API client |
| `frontend/src/contexts/HubContext.tsx` | Hub state management |

## Implementation Estimate

| Phase | Tasks | Hours |
|-------|-------|-------|
| 1 | Hub activation + QR generation on Flask | 1.5 |
| 2 | Hub API endpoints + SQLite storage | 1.5 |
| 3 | Background sync worker | 1 |
| 4 | Phone: QR scanner + Hub Mode UI | 1.5 |
| 5 | Phone: Offline buffer during wifi gaps | 1 |
| 6 | Testing + edge cases | 1 |
| **Total** | | **~7 hours** |

## Security (Per Your Requirements)

- QR code contains temp auth token (expires after shift)
- One device connected at a time
- Shift connect/disconnect logging
- Operator credentials embedded in QR for secure connection