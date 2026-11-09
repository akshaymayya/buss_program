# 🚌 MeFleet — Transport Management Platform

> **B2B Fleet Management System for Regional Bus Operators**
> Built with FastAPI · Next.js · SQLite · TypeScript

---

## Overview

**MeFleet** (codename: BUSS PROGRAM) is an operational fleet management platform designed for regional bus companies and transport operators. It manages the full lifecycle of a transport operation — from fleet inventory and crew assignment to live trip tracking and intelligent route analysis.

The system is designed for **internal operator use**: dispatchers, fleet supervisors, and management staff who need a single interface to coordinate vehicles, crew, and trips across multiple corridors.

---

## Key Features

| Module | What it does |
|---|---|
| **Fleet Management** | Register, track and update bus status (Available / On Trip / Maintenance) |
| **Employee Management** | Manage drivers and helpers — availability, qualifications, rest hours, location |
| **Trip Dispatch** | Assign buses and crew to trips with conflict and double-booking prevention |
| **Smart Crew Advisor** | Rule-based recommendations for nearest available driver/helper per corridor |
| **Route Analyzer** | Corridor feasibility scoring using road distance, weather, and traffic patterns |
| **Live Map** | Real-time map view of active trips and driver locations |
| **Active Trips Dashboard** | Live status panel for all ongoing operations |

---

## Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Next.js 16 · React 19 · TypeScript · Tailwind)    │
│  ┌────────────────┐  ┌───────────────────────────────────┐  │
│  │  / Dashboard   │  │  /management  (Fleet, Crew, Trips) │  │
│  └────────────────┘  └───────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTP REST (CORS)
┌──────────────────────────▼──────────────────────────────────┐
│  FastAPI 0.162  (Python 3.14)                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ /routes  │ │  /fleet  │ │/employees│ │   /trips     │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Services: IntelligenceEngine · CrewAdvisor · FleetAI │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  SQLite (WAL mode) — mefleet.db                             │
│  Tables: employees · buses · trips · routes                 │
└─────────────────────────────────────────────────────────────┘
                           │  Optional (graceful fallback)
                    ┌──────┴───────┐
                    │ External APIs │
                    │ ORS · Weather │
                    └──────────────┘
```

---

## Technology Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.14 | Runtime |
| FastAPI | 0.162 | REST API framework |
| Uvicorn | 0.54 | ASGI server |
| SQLite | (stdlib) | Persistent storage with WAL mode |
| Pydantic v2 | 2.14 | Request/response validation |
| pydantic-settings | 2.16 | 12-factor environment config |
| httpx | 0.28 | Async HTTP client for external APIs |
| python-dateutil | — | Date parsing and manipulation |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.1.1 | React framework with App Router |
| React | 19.2.3 | UI library |
| TypeScript | 5.9 | Type-safe JavaScript |
| Tailwind CSS | 4 | Utility-first styling |
| Leaflet + react-leaflet | 1.9 / 5.0 | Interactive map rendering |

### External APIs (Optional)

| API | Used for | Fallback behaviour |
|---|---|---|
| [OpenRouteService](https://openrouteservice.org/) | Road distance and geometry | Haversine straight-line estimate |
| [OpenWeatherMap](https://openweathermap.org/) | Weather conditions per corridor | Neutral weather assumed |

---

## Design Principles

### 1. Verified-Arrival Location Rule
Employee `current_location` is **only updated when a supervisor confirms arrival** at the destination. It is never changed on departure or during dispatch. This ensures the location field always reflects physical ground truth, not planned movements.

### 2. SQLite WAL Concurrency
The database runs in **Write-Ahead Logging (WAL) mode** with `BEGIN IMMEDIATE` transactions for all dispatch operations. This prevents double-booking races without requiring a separate process or external queue.

### 3. Deterministic Business Logic
Route scoring, crew recommendations, and corridor feasibility calculations are implemented as **pure Python functions**. No LLM or ML model is involved in operational decisions.

### 4. Graceful API Degradation
Both `ORS_API_KEY` and `OPENWEATHER_API_KEY` are optional. If absent, the system falls back to built-in heuristics — the application runs fully without any API key.

### 5. 12-Factor Configuration
All environment-specific values (API keys, database path, CORS origins) are loaded from `.env` via `pydantic-settings`. No secrets are hardcoded in source files.

---

## Project Structure

```
BUSS PROGRAM/
├── backend/
│   ├── main.py                      # FastAPI app entry point
│   ├── mefleet.db                   # SQLite database (gitignored)
│   ├── .env                         # Your local env vars (gitignored)
│   ├── .env.example                 # Template — copy to .env
│   ├── requirements.txt             # Python dependencies
│   ├── test_mefleet.py              # Integration test suite (5 suites)
│   └── app/
│       ├── core/
│       │   └── config.py            # Settings (pydantic-settings)
│       ├── db/
│       │   └── database.py          # SQLite schema, WAL config, init_db()
│       ├── models/
│       │   └── schemas.py           # Pydantic request/response models
│       ├── routers/
│       │   ├── routes.py            # POST /api/routes/analyze
│       │   ├── fleet.py             # CRUD /api/fleet
│       │   ├── employees.py         # CRUD + dispatch /api/employees
│       │   └── trips.py             # CRUD + lifecycle /api/trips
│       └── services/
│           ├── intelligence.py      # RouteGISAdapter + CorridorFeasibilityCalculator
│           ├── crew_advisor.py      # Smart crew recommendations
│           └── fleet_advisor.py     # Rule-based fleet scoring
├── frontend/
│   ├── app/
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # / — Operations dashboard
│   │   └── management/
│   │       └── page.tsx             # /management — Fleet & crew management
│   ├── components/
│   │   ├── ActiveTrips.tsx          # Live trips status panel
│   │   ├── FleetGrid.tsx            # Bus inventory grid
│   │   ├── FleetManager.tsx         # Bus CRUD management
│   │   ├── DriverHelperManager.tsx  # Crew CRUD management
│   │   ├── TripAssignmentModal.tsx  # Dispatch modal
│   │   ├── SmartTripAssignment...   # AI-suggested crew/bus panel
│   │   ├── RouteAnalyzer.tsx        # Route profitability analyzer
│   │   ├── LiveMap.tsx              # Leaflet map component
│   │   ├── OfficeManager.tsx        # Office/branch management
│   │   ├── DigitalPresence.tsx      # Company digital profile
│   │   └── RedditNavShell.tsx       # Navigation shell
│   ├── lib/
│   │   └── api.ts                   # Centralised API base URL helper
│   ├── .env.local                   # Your local frontend env (gitignored)
│   └── .env.example                 # Template — copy to .env.local
└── venv/                            # Python virtual environment (gitignored)
```

---

## Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| Python | 3.11+ (3.14 recommended) | Must have `pip` available |
| Node.js | 18+ | LTS recommended |
| npm | 9+ | Comes with Node.js |
| Git | 2.x | For cloning the repo |

No Docker, Redis, or database server required — SQLite is embedded.

---

## Installation & Setup

### 1. Clone the repository

```powershell
git clone https://github.com/akshaymayya/buss_program.git
cd "buss_program"
```

### 2. Backend setup

```powershell
# Create a virtual environment
python -m venv venv

# Activate it (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r backend/requirements.txt
```

### 3. Backend environment variables

```powershell
# Copy the template
Copy-Item backend\.env.example backend\.env
```

Edit `backend/.env` and optionally fill in your API keys:

```env
# OpenRouteService — for real road distances (optional)
ORS_API_KEY=your_ors_key_here

# OpenWeatherMap — for weather warnings (optional)
OPENWEATHER_API_KEY=your_weather_key_here

# Leave DATABASE_URL as default for local SQLite
DATABASE_URL=sqlite:///./mefleet.db
```

> Both API keys are optional. The application runs in simulation mode if they are absent.

### 4. Frontend setup

```powershell
cd frontend
npm install
cd ..
```

### 5. Frontend environment variables

```powershell
Copy-Item frontend\.env.example frontend\.env.local
```

The default `frontend/.env.local` points to your local backend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Change this to your deployed backend URL when running in production.

---

## Running the Application

You need **two terminal windows** running simultaneously.

### Terminal 1 — Start the backend

```powershell
cd backend
# With venv activated:
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The backend starts at `http://localhost:8000`.

### Terminal 2 — Start the frontend

```powershell
cd frontend
npm run dev
```

The frontend starts at `http://localhost:3000`.

---

## Application Pages

| URL | Page | Description |
|---|---|---|
| `http://localhost:3000` | Operations Dashboard | Live map, active trips, fleet status, route analyzer |
| `http://localhost:3000/management` | Management Panel | Manage fleet, crew, offices, trip assignments |
| `http://localhost:8000/docs` | API Docs (Swagger UI) | Interactive API documentation |
| `http://localhost:8000/redoc` | API Docs (ReDoc) | Alternative documentation view |

---

## API Reference

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | System status check |

### Routes

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/routes/analyze` | Analyse corridor feasibility and profitability |

**Request body:**
```json
{
  "source": "Bangalore",
  "destination": "Mangalore",
  "travel_date": "2026-11-15"
}
```

### Fleet

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/fleet` | List all buses |
| `POST` | `/api/fleet` | Add a new bus |
| `GET` | `/api/fleet/{bus_id}` | Get bus details |
| `PUT` | `/api/fleet/{bus_id}` | Update bus details |
| `DELETE` | `/api/fleet/{bus_id}` | Remove a bus |
| `PATCH` | `/api/fleet/{bus_id}/status` | Update bus status |

### Employees

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/employees` | List all employees |
| `POST` | `/api/employees` | Add a new employee |
| `GET` | `/api/employees/{employee_id}` | Get employee details |
| `PUT` | `/api/employees/{employee_id}` | Update employee |
| `DELETE` | `/api/employees/{employee_id}` | Remove employee |
| `GET` | `/api/employees/available` | List available employees for dispatch |
| `POST` | `/api/employees/{id}/dispatch` | Assign employee to trip |

### Trips

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/trips` | List all trips |
| `POST` | `/api/trips` | Create a new trip |
| `GET` | `/api/trips/{trip_id}` | Get trip details |
| `PUT` | `/api/trips/{trip_id}` | Update trip |
| `DELETE` | `/api/trips/{trip_id}` | Delete trip |
| `POST` | `/api/trips/{trip_id}/start` | Mark trip as started |
| `POST` | `/api/trips/{trip_id}/complete` | Mark trip as completed |
| `POST` | `/api/trips/{trip_id}/verify-arrival` | Supervisor verifies crew arrival |

---

## Intelligence Services

### IntelligenceEngine (`backend/app/services/intelligence.py`)

The route analysis engine is split into two layers:

**`RouteGISAdapter`** — Network I/O layer
- Calls OpenRouteService to get real road distance and duration
- Calls OpenWeatherMap for weather conditions at the destination
- Returns raw geographic and atmospheric data
- Falls back gracefully when API keys are absent

**`CorridorFeasibilityCalculator`** — Pure deterministic math
- Calculates profitability score from distance, fuel cost, toll estimates, and passenger load
- Applies weather penalties and seasonal demand factors
- Produces a `FEASIBLE` / `MODERATE` / `RISKY` classification
- Zero external dependencies — 100% testable offline

### Smart Crew Advisor (`backend/app/services/crew_advisor.py`)

Recommends the best available drivers and helpers for a given trip using:
- Current physical location proximity to the departure point
- Active availability window checks
- Mandatory rest period enforcement
- Driver licence validity
- Historical corridor experience scoring

No LLM or ML model is involved. All recommendations are deterministic and auditable.

---

## Running Tests

The integration test suite (`backend/test_mefleet.py`) covers 5 test suites:

| Suite | Tests |
|---|---|
| Suite 1 | Full employee and trip lifecycle |
| Suite 2 | Fleet persistence across requests |
| Suite 3 | Bus double-booking conflict rejection |
| Suite 4 | Concurrent dispatch race condition prevention |
| Suite 5 | CorridorFeasibilityCalculator pure math |

**Start the backend first**, then in a separate terminal:

```powershell
# From the project root
$env:PYTHONPATH = "backend"
.\venv\Scripts\python.exe backend/test_mefleet.py
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `ORS_API_KEY` | No | — | OpenRouteService API key |
| `OPENWEATHER_API_KEY` | No | — | OpenWeatherMap API key |
| `DATABASE_URL` | No | `sqlite:///./mefleet.db` | SQLite database path |
| `ENVIRONMENT` | No | `development` | Runtime environment |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Allowed CORS origins |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:8000` | Backend API base URL |

---

## Database

The application uses **SQLite with WAL (Write-Ahead Logging) mode**.

- Database file: `backend/mefleet.db` (created automatically on first run)
- Schema is initialised by `init_db()` in `backend/app/db/database.py`
- Four seed buses are inserted on first startup: B1, B2 (Available), B3 (Maintenance), B4 (Available)
- No migration tool is required — `init_db()` is idempotent

**Concurrency:** All dispatch operations use `BEGIN IMMEDIATE` transactions via the `immediate_transaction()` context manager to prevent double-booking under concurrent load.

---

## What Is Not Yet Implemented

| Feature | Planned Phase | Notes |
|---|---|---|
| Authentication & login | P2 | Currently no auth — internal use only |
| Role-based access control | P2 | All routes are public |
| Company / tenant isolation | P2 | Single-tenant at present |
| PostgreSQL migration | P2 | SQLite is current production database |
| LLM / RAG integration | P3 | No LLM calls in current codebase |
| Background task workers | P3 | No Celery/Redis — not yet required |
| Docker / container deployment | Future | No Dockerfile present |

---

## Contributing & Development

```powershell
# Backend (hot reload enabled)
cd backend
uvicorn main:app --reload

# Frontend (hot reload enabled)
cd frontend
npm run dev

# Frontend production build (verify TypeScript compiles cleanly)
npm run build
```

**Branch strategy:**
- `main` — stable, tested code
- `refactor/phase-p0` — P0 architecture work (merged)
- Future phases will use `refactor/phase-p1`, `refactor/phase-p2`, etc.

---

## License

This project is licensed under the terms found in the [LICENSE](LICENSE) file.

---

## Repository

**GitHub:** [akshaymayya/buss_program](https://github.com/akshaymayya/buss_program)
