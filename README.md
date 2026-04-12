# RainUSE Nexus (AquaScan monorepo)

RainUSE Nexus is an **autonomous water-opportunity intelligence system** for Grundfos: it discovers, evaluates, and acts on commercial building prospects (scheduled rescoring, threshold crossings, deep research, and rep routing) with **explainable** viability scores and a **map-first** command center. This is not a generic CRUD dashboard; the product centers on an automation engine, auditable scores, and modular city adapters.

**Authoritative specs**

- Product and UX depth: [RainUSE_Nexus_Complete_Outline (1).md](RainUSE_Nexus_Complete_Outline%20(1).md)
- Build order and phase details: [Claude Phases/](Claude%20Phases/) (start with `PHASE_00_PROJECT_FOUNDATION.md`)

**Hackathon / demo note:** The demo is **DFW-first** with pre-seeded buildings and automation history (see Phase 00 seed strategy). Seed implementation lives in Phase 01 (`backend/seed/seed_dfw.py`).

## Quickstart

1. **Data plane (Docker)**

   Install [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/) and **start Docker Desktop** once so the `docker` CLI is on your `PATH`. Then from the repo root:

   ```bash
   docker compose up -d
   ```

   If you see `command not found: docker`, Docker is not installed or not running—open Docker Desktop from Applications, wait until it says “running,” then try again in a **new** terminal window.

   On first boot, Postgres runs scripts in `db/init/` (schema + PostGIS). To verify PostGIS and tables after containers are healthy:

   ```bash
   docker compose exec db psql -U rainuse -d rainuse -c "SELECT PostGIS_Version();"
   docker compose exec db psql -U rainuse -d rainuse -c "\dt"
   ```

   **Without Docker:** you need PostgreSQL 15 + PostGIS and Redis installed by some other means (for example Homebrew formulas and manual `psql -f db/init/001_schema.sql`). The compose file is the supported path for this repo.

2. **Environment**

   ```bash
   cp .env.example .env
   ```

   Fill in secrets (Auth0, Mapbox, AI keys) when you implement later phases.

3. **Frontend** (from repo root)

   ```bash
   cd frontend && npm install && npm run dev
   ```

4. **Backend** (Phase 01 — FastAPI, PostGIS, seed)

   On macOS, Homebrew’s Python is **PEP 668 “externally managed”**: use a **venv** in `backend/` before `pip install`.

   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

   Ensure `.env` at the repo root defines `DATABASE_URL` (see [.env.example](.env.example)). The default uses the **`postgresql+psycopg_async://`** driver (works on Python 3.13 with the pinned `psycopg[binary]` package).

   **Alembic + Docker init:** Tables are created by Docker’s `db/init/001_schema.sql`. Align Alembic’s version table once (no DDL run):

   ```bash
   cd backend && source .venv/bin/activate && alembic stamp 5712fbf55610
   ```

   **Load demo data:**

   ```bash
   cd backend && source .venv/bin/activate && python -m seed.seed_dfw
   ```

   The seed script truncates and re-inserts demo rows (5 anchor buildings + 50 DFW + 10 PA, alerts, adapters, automation, inbox).

   **Run the API:**

   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   **Smoke checks:**

   ```bash
   curl "http://localhost:8000/api/buildings?state=TX" | jq '.count'    # expect 55
   curl "http://localhost:8000/api/alerts?state=TX" | jq '.count'       # expect 15+
   curl "http://localhost:8000/api/states/TX/vs/PA" | jq '.TX.avg_viability_score'
   curl "http://localhost:8000/health"
   ```

   **Portfolio** example (ticker slug): `curl "http://localhost:8000/api/portfolio/amzn"`

   Set `CORS_ORIGINS` in `.env` if the frontend runs on a host other than `http://localhost:3000`.

## Auth0 roles (manual dashboard checklist)

Create these roles in the Auth0 dashboard (see Phase 00 §9):

| Role key           | Access level |
| ------------------ | ------------ |
| `grundfos_rep`     | Full access to their territory; inbox, memos, approve outreach. |
| `grundfos_manager` | Full access to all territories; all reps’ inboxes. |
| `partner_view`     | Read-only, assigned state’s buildings only. |
| `demo_judge`       | Read-only across features; sample data on auth-gated pages. |

Roles live in `app_metadata.roles[]` and should appear on the JWT as `https://rainuse.io/roles` via a custom Auth0 Action. `user_metadata` holds territory, cadence, score threshold, onboarding flags, voice model, rep ZIP.

## Repository layout

- `frontend/` — Next.js 14 App Router, design tokens, route stubs
- `backend/` — FastAPI + async SQLAlchemy (Phase 01: models, `/api/*` routes, `seed_dfw.py`, Alembic baseline)
- `db/init/` — PostgreSQL + PostGIS DDL (matches Phase 00 schema)
- `docker-compose.yml` — Postgres 15 + PostGIS, Redis 7
