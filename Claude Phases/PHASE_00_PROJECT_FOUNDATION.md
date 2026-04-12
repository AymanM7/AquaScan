# PHASE 00 — Project Foundation & Architecture Overview
## RainUSE Nexus · Autonomous Water-Opportunity Intelligence Engine
**Hackathon Build Document — Read First Before Any Phase**

---

## 1. What We Are Building

RainUSE Nexus is a full-stack, AI-powered web application that automatically identifies commercial and industrial buildings in the continental United States that are high-value targets for Grundfos water reuse systems. It fuses satellite imagery analysis, financial/regulatory data, climate data, and corporate ESG intelligence into a single ranked **Viability Score** per building. It then autonomously researches those buildings overnight, generates intelligence dossiers, and briefs sales reps by voice when they log in.

This is not a dashboard. It is an autonomous prospecting machine with a cinematic, mission-control interface.

---

## 2. Tech Stack — Definitive List

### Frontend
- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** Tailwind CSS + custom CSS variables for the design system
- **Map:** `mapbox-gl` + `@deck.gl/react` + `@deck.gl/aggregation-layers`
- **Animation:** `framer-motion`, `react-spring`, `canvas-confetti`
- **State Management:** `zustand` (global), `swr` (data fetching/cache)
- **Charts:** `recharts`
- **Tables:** `@tanstack/react-table`
- **UI Primitives:** `@radix-ui/react-*` (dialogs, tooltips, selects, sliders)
- **Icons:** `@phosphor-icons/react`
- **Utilities:** `clsx`, `tailwind-merge`, `date-fns`, `react-use`
- **Auth:** `@auth0/auth0-react`

### Backend
- **API Framework:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL 15 + PostGIS extension
- **ORM:** SQLAlchemy 2.0 + asyncpg
- **Task Queue:** Celery + Redis (for automation engine)
- **Cron Scheduling:** Celery Beat
- **HTTP Client:** `httpx` (async)

### External APIs & Services
- **Auth0** — Universal Login, RBAC roles, user metadata, AI Agent approval gates
- **Mapbox** — Map tiles, satellite imagery, geocoding
- **Claude API** (`claude-sonnet-4-6`) — Deal memos, boardroom dialogue, market verdicts, debrief scripts
- **Gemini API** (`gemini-2.0-flash`) — Voice pitch scripts, satellite image analysis, HydroDeliberation
- **Perplexity Sonar API** — Live web research for automation dossiers
- **ElevenLabs API** — Text-to-speech for login intelligence debrief
- **NAIP/Sentinel-2** — Satellite imagery (served via static tiles or Mapbox raster layers for demo)

### Data Storage
- PostgreSQL + PostGIS (primary relational + geospatial)
- Redis (Celery broker + result backend, session cache)
- Object storage (S3-compatible) for satellite imagery chips, audio files, generated PDFs

---

## 3. Design System — Non-Negotiable

This is the single most important aspect of the frontend. Every AI coding step must adhere to this exactly.

### Color Palette
```css
:root {
  --color-bg-primary: #060D1A;          /* Near-black navy — base background */
  --color-bg-surface: #0D1B2E;          /* Cards, panels, elevated surfaces */
  --color-bg-surface-2: #142236;        /* Second-level cards, nested panels */
  --color-accent-teal: #00E5CC;         /* PRIMARY action color — buttons, highlights, scores */
  --color-accent-amber: #F5A623;        /* Economic signals, warnings */
  --color-accent-blue: #60A5FA;         /* Drought/climate data */
  --color-accent-green: #4ADE80;        /* Incentives, ESG, positive signals */
  --color-accent-purple: #A78BFA;       /* Corporate/ESG signals */
  --color-accent-coral: #FB7185;        /* Flood risk, danger signals */
  --color-text-primary: #E8F4F8;        /* Ice-white — primary text */
  --color-text-secondary: #7A95B0;      /* Subdued labels, captions */
  --color-text-mono: #00E5CC;           /* Monospaced data values */
  --color-border: rgba(0, 229, 204, 0.15); /* Subtle teal borders */
  --color-border-active: rgba(0, 229, 204, 0.6); /* Active/hover borders */
}
```

### Typography
```
Headings:       Syne (Google Fonts) — geometric, architectural
Numeric data:   Space Mono (Google Fonts) — monospaced sensor-reading feel  
Body/Labels:    IBM Plex Sans (Google Fonts) — technical legibility
```

Load all three via `next/font/google`. Apply in `globals.css` and `layout.tsx`.

### Motion Rules
- Panel entrances: `framer-motion` spring physics — `type: "spring", stiffness: 300, damping: 30`
- Score bars: sequential staggered reveals, 80ms between each
- Map buildings: bloom in cascading by score on state load, 30ms stagger, scale 0→1
- Genome hexagons: organic 2.4s breathing cycle, each hex offset by 200ms so they're never synchronized
- All page transitions: shared layout transitions via Framer Motion `<AnimatePresence>`
- NO `ease-in-out` for hero animations — always spring physics

### Component Aesthetic Rules
- All cards: `background: var(--color-bg-surface)`, `border: 1px solid var(--color-border)`, `border-radius: 12px`
- Glowing elements: `box-shadow: 0 0 20px rgba(0, 229, 204, 0.3)` for teal glow
- Active/selected states: `border-color: var(--color-border-active)` + teal glow shadow
- All score rings: SVG `circle` with `stroke-dashoffset` animated from 0 to value
- Dark map as the base — interface wraps around map, not the other way

---

## 4. Monorepo Structure

```
rainuse-nexus/
├── frontend/                    # Next.js 14 App Router
│   ├── app/
│   │   ├── layout.tsx           # Root: Auth0 provider, Zustand, fonts, globals
│   │   ├── globals.css          # CSS variables, base reset, font loading
│   │   ├── page.tsx             # Landing / Mission Control Entry (/)
│   │   ├── onboarding/
│   │   │   └── page.tsx         # Three-step setup wizard (/onboarding)
│   │   ├── map/
│   │   │   └── page.tsx         # Map Intelligence Dashboard (/map)
│   │   ├── building/
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Building Intelligence Detail (/building/[id])
│   │   ├── compare/
│   │   │   └── page.tsx         # State Battle Arena (/compare)
│   │   ├── portfolio/
│   │   │   └── [owner]/
│   │   │       └── page.tsx     # Portfolio Domino View (/portfolio/[owner])
│   │   ├── dealroom/
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Secure Dealroom (/dealroom/[id])
│   │   ├── feed/
│   │   │   └── page.tsx         # Opportunity Shock Feed (/feed)
│   │   ├── automation/
│   │   │   └── page.tsx         # Automation Intelligence Center (/automation)
│   │   ├── report/
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Intelligence Report Detail (/report/[id])
│   │   └── inbox/
│   │       └── page.tsx         # Rep Notification Inbox (/inbox)
│   │
│   ├── components/
│   │   ├── map/                 # Map-specific components
│   │   ├── building/            # Building detail components
│   │   ├── onboarding/          # Onboarding wizard components
│   │   ├── automation/          # Automation center components
│   │   ├── report/              # Report dossier components
│   │   ├── inbox/               # Inbox components
│   │   ├── state-battle/        # Compare page components
│   │   └── shared/              # Reusable across pages
│   │
│   ├── lib/
│   │   ├── scoring.ts           # Viability score + WRAI computation (client-side)
│   │   ├── hydrology.ts         # Water capture formula engine
│   │   ├── adapters/            # City incentive adapters (JSON + parser)
│   │   ├── gemini.ts            # Gemini API client
│   │   ├── claude.ts            # Claude API client
│   │   ├── auth.ts              # Auth0 role helpers
│   │   └── api.ts               # Typed fetch wrapper for backend
│   │
│   ├── store/
│   │   ├── buildingStore.ts     # Selected building, state, filters (Zustand)
│   │   └── alertStore.ts        # Shock ticker event queue
│   │
│   ├── types/
│   │   └── index.ts             # Shared TypeScript types
│   │
│   └── middleware.ts            # Auth0 route protection, onboarding redirect
│
├── backend/                     # FastAPI Python
│   ├── main.py                  # FastAPI app entry, CORS, router registration
│   ├── database.py              # SQLAlchemy async engine + session factory
│   ├── models/                  # SQLAlchemy ORM models (one file per domain)
│   ├── routers/                 # FastAPI routers (one file per domain)
│   ├── services/                # Business logic layer
│   ├── tasks/                   # Celery tasks (automation engine)
│   ├── adapters/                # City incentive rule adapters (Python)
│   └── seed/                    # Seed data scripts for demo buildings
│
├── docker-compose.yml           # PostgreSQL + PostGIS + Redis local dev
├── .env.example                 # All required environment variables
└── README.md
```

---

## 5. Database Schema — Complete

All tables live in PostgreSQL 15 with PostGIS enabled.

```sql
-- Core building data
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  polygon GEOMETRY(POLYGON, 4326) NOT NULL,
  centroid GEOMETRY(POINT, 4326) NOT NULL,
  state VARCHAR(2) NOT NULL,
  city VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  zip VARCHAR(10),
  sector VARCHAR(50),         -- 'Data Center','Logistics','Manufacturing','Hospital','University'
  roof_sqft INTEGER NOT NULL,
  area_confidence FLOAT,       -- 0.0–1.0
  name VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_buildings_state ON buildings(state);
CREATE INDEX idx_buildings_polygon ON buildings USING GIST(polygon);

-- Computer vision results
CREATE TABLE cv_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id),
  ct_detected BOOLEAN DEFAULT FALSE,
  ct_confidence FLOAT,          -- 0.0–1.0
  ct_boxes JSONB,               -- [{x,y,w,h,confidence}, ...]
  roof_mask_url TEXT,
  roof_confidence FLOAT,
  imagery_source VARCHAR(50),   -- 'NAIP','Sentinel-2'
  analysis_date DATE,
  raw_chip_url TEXT,
  masked_chip_url TEXT
);

-- Climate and environmental data
CREATE TABLE climate_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id),
  annual_rain_inches FLOAT,
  drought_score INTEGER,        -- 0–4 (D0–D4)
  drought_label VARCHAR(10),    -- 'None','D0','D1','D2','D3','D4'
  flood_zone VARCHAR(10),       -- 'AE','X','AO', etc.
  fema_class VARCHAR(50),
  fema_flood_risk FLOAT,        -- 0.0–1.0
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial and utility data
CREATE TABLE financial_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id),
  city_id VARCHAR(50),
  water_rate_per_kgal FLOAT,
  sewer_rate_per_kgal FLOAT,
  stormwater_fee_annual FLOAT,
  stormwater_eru_rate FLOAT,
  utility_source TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- City incentive adapters
CREATE TABLE incentive_adapters (
  city_id VARCHAR(50) PRIMARY KEY,
  city_name VARCHAR(100),
  state VARCHAR(2),
  rebate_usd INTEGER,
  mandate_threshold_sqft INTEGER,
  sales_tax_exempt BOOLEAN,
  property_tax_exempt BOOLEAN,
  stormwater_credit_pct FLOAT,
  green_infra_grant_max INTEGER,
  program_name TEXT,
  description TEXT,
  adapter_json JSONB
);

-- Corporate and ESG data
CREATE TABLE corporate_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id),
  owner_name TEXT,
  sec_cik VARCHAR(20),
  esg_score FLOAT,
  water_mentions INTEGER,
  filing_year INTEGER,
  leed_certified BOOLEAN,
  leed_level VARCHAR(20),
  esg_accelerator BOOLEAN DEFAULT FALSE,  -- >5 water mentions
  ticker VARCHAR(10),
  corporate_parent TEXT
);

-- Computed viability scores
CREATE TABLE viability_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) UNIQUE,
  final_score FLOAT NOT NULL,             -- 0–100, confidence-adjusted
  score_raw FLOAT,                        -- pre-confidence-adjustment
  physical_score FLOAT,                   -- 0–40
  economic_score FLOAT,                   -- 0–35
  strategic_score FLOAT,                  -- 0–25
  wrai FLOAT,                             -- 0–100 Water Resilience Alpha Index
  genome_archetype VARCHAR(100),
  confidence_composite FLOAT,
  last_computed TIMESTAMPTZ DEFAULT NOW()
);

-- Alert/shock events
CREATE TABLE alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL,  -- 'drought','ordinance','rate','sec','incentive'
  state VARCHAR(2),
  city VARCHAR(100),
  building_ids UUID[],
  score_delta FLOAT,
  description TEXT,
  source TEXT,
  event_timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- User settings (onboarding config)
CREATE TABLE user_settings (
  user_id VARCHAR(200) PRIMARY KEY,  -- Auth0 user ID
  territory VARCHAR(50) DEFAULT 'DFW',
  cadence VARCHAR(20) DEFAULT 'weekly',  -- 'daily','weekly','biweekly'
  score_threshold INTEGER DEFAULT 75,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  rep_zip VARCHAR(10),
  notification_email BOOLEAN DEFAULT TRUE,
  voice_model VARCHAR(50) DEFAULT 'rachel',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation run history
CREATE TABLE automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(200) REFERENCES user_settings(user_id),
  run_at TIMESTAMPTZ DEFAULT NOW(),
  buildings_scanned INTEGER,
  crossings_count INTEGER,
  reports_dispatched INTEGER,
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending','running','completed','failed'
  error_message TEXT,
  completed_at TIMESTAMPTZ
);

-- Automation intelligence reports
CREATE TABLE automation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES automation_runs(id),
  building_id UUID REFERENCES buildings(id),
  score_at_trigger FLOAT NOT NULL,
  sonar_raw_json JSONB,
  ownership_data JSONB,
  contact_data JSONB,
  outreach_scripts JSONB,   -- {cold_email, linkedin, phone}
  routed_to_rep_id VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rep notification inbox
CREATE TABLE rep_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES automation_reports(id),
  rep_id VARCHAR(200),
  read_at TIMESTAMPTZ,
  actioned_at TIMESTAMPTZ,
  action_type VARCHAR(50),  -- 'approved','rejected','sent'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ElevenLabs login debriefs
CREATE TABLE login_debriefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(200) REFERENCES user_settings(user_id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  script_text TEXT NOT NULL,
  elevenlabs_audio_url TEXT,
  played_at TIMESTAMPTZ
);
```

---

## 6. Environment Variables

```bash
# .env.example — all required for full app function

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...

# Auth0
AUTH0_SECRET=<random-64-char>
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_AUTH0_DOMAIN=your-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id

# AI APIs
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
PERPLEXITY_API_KEY=pplx-...
ELEVENLABS_API_KEY=el_...
ELEVENLABS_VOICE_ID_RACHEL=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_VOICE_ID_ADAM=pNInz6obpgDQGcFmaJgB

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/rainuse
POSTGRES_USER=rainuse
POSTGRES_PASSWORD=rainuse_dev
POSTGRES_DB=rainuse

# Redis / Celery
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# Object Storage (S3-compatible)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=rainuse-assets
S3_ENDPOINT_URL=http://localhost:9000  # or real S3

# Backend
BACKEND_API_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## 7. Seed Data Strategy for Hackathon Demo

Because real satellite CV processing takes time, all building data for the demo is **pre-seeded** in the database. The seed dataset covers the **DFW Metro area** with approximately 50–100 buildings, pre-computed with:
- Realistic roof sizes (50,000–400,000 sqft range, majority >100k)
- Pre-computed CV confidence scores (mocked as realistic float values)
- Pre-loaded financial/climate data from DFW actual rates
- Pre-computed Viability Scores and WRAI
- Polygon coordinates as real GeoJSON (pulled from Open Buildings Dataset or Microsoft Footprint Data)
- Pre-seeded alert events (12–20 realistic Texas-specific events)
- Pre-seeded one completed automation run with 3 generated reports

The seed script lives at `backend/seed/seed_dfw.py` and is run once during setup.

---

## 8. Build Phases Overview

| Phase | Title | Focus |
|---|---|---|
| **00** | Project Foundation | Architecture, schema, design system (this doc) |
| **01** | Backend Core | FastAPI setup, DB models, core API routes |
| **02** | Scoring Engine | Viability Score, WRAI, hydrology, incentive adapters |
| **03** | Landing & Onboarding | Pages `/` and `/onboarding` with full animation |
| **04** | Map Intelligence Dashboard | `/map` with all layers, filters, and animations |
| **05** | Building Intelligence Detail | `/building/[id]` with all 8 sections |
| **06** | AI Integration Layer | Claude, Gemini, Perplexity, ElevenLabs clients |
| **07** | Automation Engine | Celery tasks, cron, run pipeline, `/automation` |
| **08** | Reports, Inbox & Dealroom | `/report/[id]`, `/inbox`, `/dealroom/[id]` |
| **09** | State Battle & Portfolio | `/compare`, `/portfolio/[owner]` |
| **10** | Feed & Shared Components | `/feed`, shared widgets, final polish |

---

## 9. Auth0 Role Setup

Create the following roles in the Auth0 dashboard:

| Role Key | Access Level |
|---|---|
| `grundfos_rep` | Full access to their territory. Can see inbox, generate memos, approve outreach. |
| `grundfos_manager` | Full access to all territories. Can see all reps' inboxes. |
| `partner_view` | Read-only access to assigned state's buildings only. |
| `demo_judge` | Read-only access to all features. Sees sample data in auth-gated pages. |

Roles are stored in `app_metadata.roles[]` and read via a custom Auth0 Action that adds roles to the JWT access token as `https://rainuse.io/roles`.

User `user_metadata` stores: `{ territory, cadence, score_threshold, onboarding_complete, voice_model, rep_zip }`.

---

## 10. Demo Data: DFW Buildings Reference

The following five buildings are the PRIMARY demo buildings that must be seeded with full, rich data. They are used in the hackathon demo script.

| Name | Address | Roof sqft | Viability Score | Genome Archetype |
|---|---|---|---|---|
| Prologis DFW Logistics Center | 2800 E Renfro St, Burleson TX | 142,000 | 87 | Storm-Value Titan |
| CyrusOne Dallas III Data Center | 1649 W Frankford Rd, Carrollton TX | 118,000 | 82 | Cooling-Driven Reuse Giant |
| Amazon FTW6 Fulfillment | 700 Westport Pkwy, Fort Worth TX | 295,000 | 91 | ESG Mandate Accelerator |
| Texas Health Presbyterian | 1600 Hospital Pkwy, Bedford TX | 108,000 | 74 | Hidden High-ROI Candidate |
| Alliance Speedway / Speedway Motorsports | 3545 Lone Star Cir, Fort Worth TX | 165,000 | 69 | Flood-Resilience Priority |

All five must have complete data across ALL database tables.

---

*End of Phase 00 — Read every subsequent phase document in order before beginning implementation.*
