# PHASE 01 — Backend Core
## FastAPI Setup, Database Models, ORM, and Core API Routes

**Prerequisite:** Read PHASE_00 completely. All schema, env vars, and naming conventions defined there are authoritative.

---

## 1. Objective

Stand up the complete FastAPI backend with:
- Database connection (PostgreSQL + PostGIS via asyncpg)
- All SQLAlchemy ORM models matching the Phase 00 schema exactly
- All core API routes for buildings, climate, financial, corporate, alerts, and user settings
- Seed script producing the 5 primary demo buildings + 50+ supporting DFW buildings
- CORS configured for the Next.js frontend
- Health check endpoint

This phase does **not** include scoring logic (Phase 02), AI routes (Phase 06), or automation tasks (Phase 07).

---

## 2. Directory Structure for This Phase

```
backend/
├── main.py
├── database.py
├── models/
│   ├── __init__.py
│   ├── building.py
│   ├── cv_result.py
│   ├── climate.py
│   ├── financial.py
│   ├── corporate.py
│   ├── score.py
│   ├── alert.py
│   └── user.py
├── routers/
│   ├── __init__.py
│   ├── buildings.py
│   ├── states.py
│   ├── alerts.py
│   ├── settings.py
│   └── health.py
├── services/
│   ├── __init__.py
│   └── building_service.py
├── schemas/
│   ├── __init__.py
│   └── building.py    (Pydantic response schemas)
├── seed/
│   ├── seed_dfw.py
│   └── dfw_buildings.json
└── requirements.txt
```

---

## 3. `requirements.txt`

```
fastapi==0.110.0
uvicorn[standard]==0.27.0
sqlalchemy[asyncio]==2.0.25
asyncpg==0.29.0
alembic==1.13.0
geoalchemy2==0.14.3
psycopg2-binary==2.9.9
pydantic==2.6.0
pydantic-settings==2.1.0
httpx==0.26.0
celery==5.3.6
redis==5.0.1
python-dotenv==1.0.0
anthropic==0.21.0
google-generativeai==0.4.0
sec-edgar-downloader==5.0.1
```

---

## 4. `database.py` — Async SQLAlchemy Engine

```python
# backend/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    class Config:
        env_file = ".env"

settings = Settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

---

## 5. ORM Models

Each model file corresponds directly to the schema in Phase 00. Below are the critical details for each.

### `models/building.py`
```python
from sqlalchemy import Column, String, Integer, Float, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from database import Base
import uuid

class Building(Base):
    __tablename__ = "buildings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    polygon = Column(Geometry('POLYGON', srid=4326), nullable=False)
    centroid = Column(Geometry('POINT', srid=4326), nullable=False)
    state = Column(String(2), nullable=False, index=True)
    city = Column(String(100), nullable=False)
    address = Column(Text, nullable=False)
    zip = Column(String(10))
    sector = Column(String(50))
    roof_sqft = Column(Integer, nullable=False)
    area_confidence = Column(Float)
    name = Column(String(200))
    created_at = Column(DateTime(timezone=True))
```

Create similarly structured models for: `CVResult`, `ClimateData`, `FinancialData`, `IncentiveAdapter`, `CorporateData`, `ViabilityScore`, `AlertEvent`, `UserSettings`, `AutomationRun`, `AutomationReport`, `RepNotification`, `LoginDebrief`.

All UUID foreign keys use `Column(UUID(as_uuid=True), ForeignKey("table.id"))`.
All JSONB columns use `Column(JSONB)` from `sqlalchemy.dialects.postgresql`.

---

## 6. `main.py` — FastAPI Application Entry

```python
# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import buildings, states, alerts, settings, health

app = FastAPI(
    title="RainUSE Nexus API",
    description="Autonomous Water-Opportunity Intelligence Engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-production-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(buildings.router, prefix="/api", tags=["Buildings"])
app.include_router(states.router, prefix="/api", tags=["States"])
app.include_router(alerts.router, prefix="/api", tags=["Alerts"])
app.include_router(settings.router, prefix="/api", tags=["Settings"])
```

---

## 7. Core API Routes — Full Specification

### `routers/buildings.py`

#### `GET /api/buildings`
**Query params:** `state` (required), `min_score` (float, optional), `min_roof` (int, optional), `sector` (str, optional), `cooling_tower` (bool, optional), `min_drought` (int, optional), `wrai_min` (float, optional), `limit` (int, default 500)

**Response:** Array of `BuildingSummary` objects sorted by `final_score DESC`.

`BuildingSummary` schema:
```python
class BuildingSummary(BaseModel):
    id: str
    name: str
    address: str
    city: str
    state: str
    sector: str
    roof_sqft: int
    centroid_lat: float
    centroid_lng: float
    polygon_geojson: dict         # GeoJSON feature
    final_score: float
    wrai: float
    genome_archetype: str
    ct_detected: bool
    ct_confidence: float
    annual_gallons: float         # pre-computed from hydrology formula
    payback_years: float
    drought_label: str
```

SQL logic: JOIN `buildings` + `viability_scores` + `cv_results` + `climate_data`. Filter by `state`, then apply optional filters. Use PostGIS `ST_AsGeoJSON(polygon)` to serialize geometry.

#### `GET /api/building/{id}`
**Response:** Full `BuildingDetail` object — all fields from all joined tables.

`BuildingDetail` extends `BuildingSummary` with:
```python
class BuildingDetail(BuildingSummary):
    # Physical
    area_confidence: float
    roof_mask_url: str
    raw_chip_url: str
    masked_chip_url: str
    ct_boxes: list           # [{x,y,w,h,confidence}]
    
    # Economic
    water_rate_per_kgal: float
    sewer_rate_per_kgal: float
    stormwater_fee_annual: float
    
    # Incentive
    rebate_usd: int
    sales_tax_exempt: bool
    property_tax_exempt: bool
    stormwater_credit_pct: float
    program_name: str
    
    # Corporate
    owner_name: str
    sec_cik: str
    esg_score: float
    water_mentions: int
    leed_certified: bool
    leed_level: str
    esg_accelerator: bool
    ticker: str
    corporate_parent: str
    
    # Climate
    annual_rain_inches: float
    flood_zone: str
    fema_flood_risk: float
    
    # Score breakdown
    physical_score: float
    economic_score: float
    strategic_score: float
    confidence_composite: float
    
    # Why-Now events
    alert_events: list[AlertEventSchema]
```

#### `GET /api/building/{id}/harvest`
**Query params:** `rainfall_adj` (float, -0.4 to 0.2, default 0), `rate_multiplier` (float, 1.0 to 2.0, default 1.0), `reuse_fraction` (float, 0.5 to 0.95, default 0.85), `runoff_coefficient` (float, 0.75 to 0.95, default 0.85)

**Response:** Water Twin computed outputs (see Phase 02 for formula details)
```python
class HarvestOutput(BaseModel):
    annual_gallons: float
    annual_savings_usd: float
    payback_years: float
    irr_pct: float
    stormwater_fee_avoidance: float
    incentives_captured: float
    npv_20yr: float
    savings_curve: list[dict]   # [{year: int, cumulative_savings: float}] length 20
```

Computation is done in Python using the hydrology formulas from Phase 02, NOT stored — computed fresh on each call.

### `routers/states.py`

#### `GET /api/states/{state_a}/vs/{state_b}`
**Response:** Two `StateProfile` objects for the battle arena.
```python
class StateProfile(BaseModel):
    state: str
    total_buildings_over_100k: int
    total_annual_opportunity_gallons: float
    avg_viability_score: float
    top_incentive_value_usd: int
    avg_drought_score: float
    top_5_buildings: list[BuildingSummary]
    radar_scores: dict   # {volume, roi, regulation, corporate, resilience} 0-100 each
```

#### `GET /api/portfolio/{owner}`
**Query params:** `owner` = company name or SEC CIK
**Response:**
```python
class PortfolioView(BaseModel):
    owner_name: str
    corporate_parent: str
    ticker: str
    building_count: int
    combined_roof_sqft: int
    combined_annual_gallons: float
    combined_potential_savings_usd: float
    first_domino_building_id: str
    first_domino_narrative: str
    buildings: list[BuildingSummary]   # sorted by score DESC
```

### `routers/alerts.py`

#### `GET /api/alerts`
**Query params:** `state` (optional), `type` (optional: drought/ordinance/rate/sec/incentive), `limit` (default 20)
**Response:** Array of `AlertEventSchema` sorted by `event_timestamp DESC`.

```python
class AlertEventSchema(BaseModel):
    id: str
    type: str
    state: str
    city: str
    building_ids: list[str]
    score_delta: float
    description: str
    source: str
    event_timestamp: str    # ISO 8601
```

### `routers/settings.py`

#### `GET /api/settings/{user_id}`
**Response:** `UserSettingsSchema` — all user preference fields

#### `POST /api/settings/{user_id}`
**Body:**
```python
class SaveSettingsRequest(BaseModel):
    territory: str
    cadence: str   # 'daily'|'weekly'|'biweekly'
    score_threshold: int
    onboarding_complete: bool
    rep_zip: Optional[str]
    notification_email: Optional[bool]
    voice_model: Optional[str]
```
**Response:** Saved `UserSettingsSchema`. Side effect: initializes Celery Beat schedule for user.

---

## 8. Seed Script — `seed/seed_dfw.py`

The seed script must produce:

**Primary buildings (5):** Full data across ALL tables. Use the exact names and addresses from Phase 00 Section 10. For polygon coordinates, use realistic approximate GeoJSON polygons centered on the actual coordinates. Generate fake-but-realistic `roof_mask_url` and `raw_chip_url` pointing to placeholder images.

**Supporting buildings (50):** Generate programmatically across Dallas, Fort Worth, Plano, Irving, Garland, Arlington, Carrollton, Mesquite. Mix of sectors. Roof sizes ranging from 80,000 to 350,000 sqft. Viability scores ranging from 38 to 91. Enough variety to make filtering and map visualization meaningful.

**Alert events (15–20):** Pre-seed with realistic Texas events:
- "Dallas County elevated to D2 drought — 14 buildings re-ranked" (type: drought, score_delta: +6.2)
- "Austin water rate increased 7.2% effective March 2026" (type: rate, score_delta: +4.1)
- "Texas commercial stormwater credit program approved" (type: ordinance, score_delta: +5.8)
- "Prologis 10-K cites water scarcity as material risk" (type: sec, score_delta: +3.4)
- "Fort Worth rebate program extended through 2027" (type: incentive, score_delta: +2.9)
*(add 10–15 more)*

**Incentive adapters (4):**
- `city_id: 'austin_tx'` — GoPurple program, $5,000 rebate, reuse mandate >100k sqft
- `city_id: 'dallas_tx'` — Commercial rebate, TX sales tax §151.355, property tax §11.32
- `city_id: 'philadelphia_pa'` — Up to $100k/acre green infra grants, 45% stormwater credits
- `city_id: 'tucson_az'` — $2,000 harvesting rebate

**One completed automation run** with 3 reports (for the demo inbox to be pre-populated):
- Run timestamp: "yesterday at 6:00 AM"
- 3 buildings flagged, 3 Sonar reports generated (use realistic mock Sonar JSON data)
- Reports routed to `rep@grundfos.com`

**One pre-generated login debrief:**
- script_text: A realistic 130-word script referencing DFW territory, 2 threshold crossings, drought D2 conditions
- elevenlabs_audio_url: placeholder URL

---

## 9. `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_USER: rainuse
      POSTGRES_PASSWORD: rainuse_dev
      POSTGRES_DB: rainuse
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

---

## 10. Startup Sequence

1. `docker-compose up -d` — starts PostgreSQL + Redis
2. `alembic upgrade head` — creates all tables
3. `python seed/seed_dfw.py` — loads demo data
4. `uvicorn main:app --reload --port 8000` — starts API
5. `celery -A tasks worker --loglevel=info` — starts Celery worker (Phase 07)
6. `celery -A tasks beat --loglevel=info` — starts Celery Beat scheduler (Phase 07)

---

## 11. Response Format Convention

All list endpoints return:
```json
{
  "data": [...],
  "count": 47,
  "filters_applied": {...}
}
```

All single-resource endpoints return the resource directly (no wrapper).

All errors return:
```json
{
  "error": "message",
  "code": "ERROR_CODE",
  "detail": "..."
}
```

HTTP 422 for validation errors (FastAPI default). HTTP 404 for not found. HTTP 500 for server errors with error log.

---

## 12. Testing the Backend

After setup, verify these endpoints return correct data:

```bash
# Should return 55 buildings for TX
curl "http://localhost:8000/api/buildings?state=TX" | jq '.count'

# Should return full detail for Amazon building
curl "http://localhost:8000/api/building/{amazon_building_id}" | jq '.genome_archetype'

# Should return 15+ alerts
curl "http://localhost:8000/api/alerts?state=TX" | jq '.count'

# Should return both state profiles
curl "http://localhost:8000/api/states/TX/vs/PA" | jq '.TX.avg_viability_score'

# Health check
curl "http://localhost:8000/health"
```

All must respond with 200 and realistic data before moving to Phase 02.
