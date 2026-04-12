# PHASE 02 — Scoring Engine
## Viability Score, WRAI, Water Twin Hydrology, and Incentive Adapters

**Prerequisite:** Phase 01 backend must be running with seeded data. All formulas here must be implemented identically in both `backend/services/scoring.py` (Python) and `frontend/lib/scoring.ts` + `frontend/lib/hydrology.ts` (TypeScript). The TypeScript versions are used for client-side Water Twin slider updates without API calls.

---

## 1. Objective

Implement the complete scoring and computation engine that produces every numeric output in the application:

- **Viability Score (0–100):** Six-pillar AHP-weighted composite, confidence-adjusted
- **WRAI (0–100):** Water Resilience Alpha Index — strategic first-mover advantage
- **Water Twin:** Per-building hydrological simulation with scenario sliders
- **Genome Archetype:** Classification label derived from score pillar dominance
- **Incentive Adapter:** City-level rules engine for rebates, exemptions, credits

---

## 2. Viability Score — Full Formula

### Pillar Structure and Weights

```
Total Score = Physical (40%) + Economic (35%) + Strategic (25%)
```

Within each pillar, sub-components are weighted as follows:

#### Physical Score (max 40 points)
```
Physical = (Roof Score × 0.50) + (Cooling Tower Score × 0.30) + (CV Confidence Score × 0.20)
```

**Roof Score (0–10 raw, normalized to pillar weight):**
- roof_sqft < 100,000 → 0
- roof_sqft 100,000–149,999 → 5
- roof_sqft 150,000–249,999 → 7
- roof_sqft 250,000–349,999 → 9
- roof_sqft ≥ 350,000 → 10

**Cooling Tower Score (0–10):**
- ct_detected = False → 3 (baseline — still qualifies for rain harvest)
- ct_detected = True, ct_confidence 0.5–0.69 → 6
- ct_detected = True, ct_confidence 0.7–0.84 → 8
- ct_detected = True, ct_confidence ≥ 0.85 → 10

**CV Confidence Score (0–10):**
```
cv_conf_score = (roof_confidence × 0.6 + area_confidence × 0.4) × 10
```

**Physical Final (0–40):**
```
physical_raw = (roof_score × 0.50 + ct_score × 0.30 + cv_conf_score × 0.20)
physical = physical_raw × 4   # scale 0-10 range to 0-40
```

#### Economic Score (max 35 points)
```
Economic = (Water Rate Score × 0.35) + (Stormwater Score × 0.30) + (Incentive Score × 0.20) + (Payback Score × 0.15)
```

**Water Rate Score (0–10):**
Rate is the combined water + sewer rate in $/kgal.
- < $8/kgal → 3
- $8–$11/kgal → 5
- $11–$14/kgal → 7
- $14–$18/kgal → 9
- > $18/kgal → 10

DFW baseline rates: Water ~$4.50/kgal, Sewer ~$5.10/kgal → combined $9.60/kgal → score ~5.

**Stormwater Score (0–10):**
Based on annual stormwater fee (ERU-based).
- < $500/yr → 2
- $500–$2,000/yr → 5
- $2,000–$5,000/yr → 7
- > $5,000/yr → 10

**Incentive Score (0–10):**
Based on total available incentive value (rebate + grant + tax savings estimate).
- $0 → 0
- $1–$5,000 → 4
- $5,001–$25,000 → 6
- $25,001–$100,000 → 8
- > $100,000 → 10

**Payback Score (0–10):**
Estimated payback period based on default scenario Water Twin output.
- > 10 years → 2
- 7–10 years → 4
- 5–7 years → 6
- 3–5 years → 8
- < 3 years → 10

**Economic Final (0–35):**
```
economic_raw = (rate_score × 0.35 + storm_score × 0.30 + incentive_score × 0.20 + payback_score × 0.15)
economic = economic_raw × 3.5   # scale 0-10 to 0-35
```

#### Strategic Score (max 25 points)
```
Strategic = (ESG Score × 0.30) + (Drought Score × 0.30) + (Flood Score × 0.20) + (LEED Score × 0.20)
```

**ESG Score (0–10):**
Based on SEC water_mentions count in most recent 10-K.
- 0 mentions → 1
- 1–2 → 3
- 3–5 → 5
- 6–9 → 7
- ≥ 10 → 10
- leed_certified = True → add +2 (cap at 10)

**Drought Score (0–10):**
- drought_score (D0=1, D1=2, D2=3, D3=4, D4=5) mapped to:
- None → 0
- D0 → 3
- D1 → 5
- D2 → 7
- D3 → 9
- D4 → 10

**Flood Score (0–10):**
- flood_zone 'X' (minimal) → 3
- flood_zone 'AO' (ponding) → 5
- flood_zone 'AE' (100-yr) → 8
- flood_zone 'VE' (coastal) → 10
- fema_flood_risk 0.0–1.0 → linear interpolation as alternative

**LEED Score (0–10):**
- leed_certified = False → 2
- leed_certified = True, level 'Certified' → 5
- leed_certified = True, level 'Silver' → 6
- leed_certified = True, level 'Gold' → 8
- leed_certified = True, level 'Platinum' → 10

**Strategic Final (0–25):**
```
strategic_raw = (esg_score × 0.30 + drought_score × 0.30 + flood_score × 0.20 + leed_score × 0.20)
strategic = strategic_raw × 2.5   # scale 0-10 to 0-25
```

### Confidence Composite
```
confidence_composite = (roof_confidence × 0.4 + ct_confidence × 0.35 + area_confidence × 0.25)
```
If `ct_detected = False`, substitute 0.8 for `ct_confidence` (we're confident there's no cooling tower, just not that one exists).

### Final Score Formula
```
V_raw = physical + economic + strategic                    # 0–100
V_adj = V_raw × (0.6 + 0.4 × confidence_composite)       # confidence-adjusted
final_score = round(V_adj, 1)                             # one decimal place
```

---

## 3. WRAI — Water Resilience Alpha Index

WRAI is a separate 0–100 metric measuring **strategic first-mover advantage** — how much competitive and regulatory edge a company gains by adopting reuse before peers are forced to.

```
WRAI = (Regulatory Momentum × 0.30) + (Climate Acceleration × 0.25) + (Peer ESG Pressure × 0.25) + (Rate Trajectory × 0.20)
```

**Regulatory Momentum (0–100):**
Score based on active/pending ordinances in the building's city:
- No ordinances → 20
- 1 active incentive program → 40
- Active reuse mandate for this building size → 70
- Mandate + pending tightening → 90
- Imminent enforcement with penalties → 100

For DFW hackathon: use lookup table per city based on seeded incentive adapter data.

**Climate Acceleration (0–100):**
```
climate_acc = (drought_score_normalized × 0.6 + fema_flood_risk × 0.4) × 100
# drought_score_normalized: None=0, D0=0.2, D1=0.4, D2=0.6, D3=0.8, D4=1.0
```

**Peer ESG Pressure (0–100):**
Based on sector-level ESG adoption rate (hardcoded by sector for demo):
- 'Data Center' → 85 (highest peer pressure)
- 'Manufacturing' → 70
- 'Logistics' → 65
- 'Hospital' → 60
- 'University' → 75
- default → 50

**Rate Trajectory (0–100):**
Based on projected utility rate increase trend (hardcoded for demo):
- DFW utilities: 7–9% annual projected increase → 72
- Austin: 8–10% → 78
- Philadelphia: 6–8% → 65
- Tucson: 10–14% → 88 (scarcity-driven)

**WRAI Badge:**
- WRAI ≥ 80 → "Act Now" badge (red/coral)
- WRAI 60–79 → "High Priority" (amber)
- WRAI 40–59 → "Monitor" (blue)
- WRAI < 40 → "Standard" (gray)

---

## 4. Genome Archetype Classification

After computing all pillar scores, classify the building into one of five archetypes based on which pillar scores dominate:

```python
def classify_genome(physical, economic, strategic, ct_detected, wrai):
    # Normalize each to 0-100 scale for comparison
    phys_norm = physical / 40 * 100
    econ_norm = economic / 35 * 100
    strat_norm = strategic / 25 * 100
    
    if ct_detected and phys_norm >= 75:
        return "Cooling-Driven Reuse Giant"
    elif phys_norm >= 80 and econ_norm >= 70:
        return "Storm-Value Titan"
    elif strat_norm >= 80 and econ_norm >= 60:
        return "ESG Mandate Accelerator"
    elif econ_norm >= 80 and phys_norm >= 60 and strat_norm < 50:
        return "Hidden High-ROI Candidate"
    elif strat_norm >= 70 and phys_norm >= 55:  # flood + drought driven
        return "Flood-Resilience Priority"
    else:
        # Fallback: whichever pillar is highest
        max_pillar = max([phys_norm, econ_norm, strat_norm])
        if max_pillar == phys_norm:
            return "Storm-Value Titan"
        elif max_pillar == econ_norm:
            return "Hidden High-ROI Candidate"
        else:
            return "ESG Mandate Accelerator"
```

---

## 5. Water Twin — Hydrological Simulation

### Core Formula
```
Annual Gallons = Roof Area (sqft) × Annual Rain (inches) × 0.623 × Runoff Coefficient × Pitch Multiplier
```

**Constants:**
- `0.623` = conversion factor (1 inch of rain on 1 sqft = 0.623 gallons)
- Runoff Coefficient default: 0.85 (TPO membrane roofing — standard commercial flat roof)
- Pitch Multiplier: 1.0 (flat commercial roofs)

**Scenario Adjustments (applied as multipliers to base annual_rain_inches):**
- Normal Year: `rainfall_adj = 0` (no adjustment)
- D3 Drought: `rainfall_adj = -0.35` (−35% rainfall)
- Rate Shock: no rainfall change, `rate_multiplier = 1.5`
- Flood Year: `rainfall_adj = +0.20` (more rain available)
- Custom: user-defined `rainfall_adj` and `rate_multiplier`

### Financial Outputs
```python
def compute_water_twin(
    roof_sqft: float,
    annual_rain_inches: float,
    water_rate_per_kgal: float,
    sewer_rate_per_kgal: float,
    stormwater_fee_annual: float,
    rebate_usd: float,
    sales_tax_exempt: bool,
    property_tax_exempt: bool,
    rainfall_adj: float = 0.0,
    rate_multiplier: float = 1.0,
    reuse_fraction: float = 0.85,
    runoff_coefficient: float = 0.85
) -> HarvestOutput:
    
    # Adjusted rainfall
    adj_rain = annual_rain_inches * (1 + rainfall_adj)
    
    # Annual harvestable gallons
    annual_gallons = roof_sqft * adj_rain * 0.623 * runoff_coefficient
    
    # Gallons actually reused
    reused_gallons = annual_gallons * reuse_fraction
    
    # Annual utility savings
    combined_rate = (water_rate_per_kgal + sewer_rate_per_kgal) * rate_multiplier
    annual_savings = (reused_gallons / 1000) * combined_rate
    
    # Stormwater fee avoidance (proportional to capture)
    capture_ratio = min(annual_gallons / (roof_sqft * adj_rain * 0.623), 1.0)
    stormwater_avoidance = stormwater_fee_annual * capture_ratio * 0.6  # 60% of fees avoidable
    
    # System CAPEX estimate (based on roof size)
    capex = roof_sqft * 0.018  # ~$1.80/sqft for commercial RWH system
    
    # Incentives
    incentives = rebate_usd
    if sales_tax_exempt:
        incentives += capex * 0.0825  # 8.25% TX sales tax
    if property_tax_exempt:
        incentives += capex * 0.012   # estimated annual property tax relief × 5yr NPV proxy
    
    # Net CAPEX after incentives
    net_capex = max(capex - incentives, capex * 0.5)
    
    # Annual total benefit
    annual_benefit = annual_savings + stormwater_avoidance
    
    # Payback period
    payback_years = net_capex / annual_benefit if annual_benefit > 0 else 99
    
    # IRR (simplified — assumes linear cash flows)
    # Use Newton's method for IRR approximation
    irr = compute_irr(net_capex, annual_benefit, years=20)
    
    # 20-year NPV (discount rate 8%)
    discount_rate = 0.08
    npv = sum([annual_benefit / (1 + discount_rate)**yr for yr in range(1, 21)]) - net_capex
    
    # Savings curve
    savings_curve = []
    cumulative = -net_capex
    for yr in range(1, 21):
        cumulative += annual_benefit
        savings_curve.append({"year": yr, "cumulative_savings": round(cumulative, 0)})
    
    return HarvestOutput(
        annual_gallons=round(annual_gallons, 0),
        annual_savings_usd=round(annual_savings, 2),
        payback_years=round(payback_years, 1),
        irr_pct=round(irr * 100, 1),
        stormwater_fee_avoidance=round(stormwater_avoidance, 2),
        incentives_captured=round(incentives, 2),
        npv_20yr=round(npv, 0),
        savings_curve=savings_curve
    )
```

### IRR Computation (Newton-Raphson)
```python
def compute_irr(capex: float, annual_cashflow: float, years: int = 20) -> float:
    """Simple IRR approximation for uniform cash flows"""
    if annual_cashflow <= 0:
        return 0.0
    
    rate = 0.10  # initial guess 10%
    for _ in range(100):
        pv = sum([annual_cashflow / (1 + rate)**yr for yr in range(1, years + 1)])
        f = pv - capex
        df = sum([-yr * annual_cashflow / (1 + rate)**(yr + 1) for yr in range(1, years + 1)])
        if abs(df) < 1e-10:
            break
        rate -= f / df
        rate = max(-0.99, min(rate, 10.0))  # clamp
    
    return rate
```

---

## 6. Incentive Adapter Engine

### JSON Schema (one file per city)
```json
{
  "city_id": "dallas_tx",
  "city_name": "Dallas / Fort Worth",
  "state": "TX",
  "programs": [
    {
      "name": "Texas Commercial Rainwater Rebate",
      "rebate_usd": 5000,
      "mandate_threshold_sqft": null,
      "eligibility": "commercial buildings with roof >10,000 sqft"
    }
  ],
  "sales_tax_exempt": true,
  "sales_tax_statute": "Texas Tax Code §151.355",
  "property_tax_exempt": true,
  "property_tax_statute": "Texas Tax Code §11.32",
  "stormwater_credit_pct": 0.0,
  "green_infra_grant_max": 0,
  "notes": "Sales and property tax exemptions apply to rainwater harvesting systems"
}
```

### Python Parser
```python
# backend/adapters/incentive.py

import json
from pathlib import Path

ADAPTERS_DIR = Path(__file__).parent / "data"

def load_adapter(city_id: str) -> dict:
    path = ADAPTERS_DIR / f"{city_id}.json"
    if not path.exists():
        return load_adapter("generic")
    with open(path) as f:
        return json.load(f)

def compute_incentive_value(adapter: dict, roof_sqft: int, capex: float) -> dict:
    total_rebate = sum(p.get("rebate_usd", 0) for p in adapter.get("programs", []))
    
    sales_tax_savings = capex * 0.0825 if adapter.get("sales_tax_exempt") else 0
    # Property tax: rough estimate, 1.5% of assessed value of system per year × 10yr
    property_tax_savings = capex * 0.015 * 10 if adapter.get("property_tax_exempt") else 0
    stormwater_credit_value = 0  # computed separately using stormwater fee data
    grant = min(adapter.get("green_infra_grant_max", 0), capex * 0.3)
    
    return {
        "rebate_usd": total_rebate,
        "sales_tax_savings": sales_tax_savings,
        "property_tax_savings_est": property_tax_savings,
        "grant_eligible": grant,
        "total_incentive_estimate": total_rebate + sales_tax_savings + property_tax_savings + grant,
        "sales_tax_exempt": adapter.get("sales_tax_exempt", False),
        "property_tax_exempt": adapter.get("property_tax_exempt", False),
        "stormwater_credit_pct": adapter.get("stormwater_credit_pct", 0),
        "program_name": adapter.get("programs", [{}])[0].get("name", "")
    }
```

### TypeScript Mirror (frontend/lib/adapters/)
Implement identical JSON files and a TypeScript parser function `loadAdapter(cityId: string)` that reads from a bundled JSON import. Used for client-side instant calculations in the Water Twin simulator.

---

## 7. Score Computation Service

### `backend/services/scoring.py`

This service is called:
1. During seed to pre-compute all 55 DFW building scores
2. During automation runs to re-score and detect threshold crossings
3. Via `GET /api/building/{id}/score/recompute` (manual refresh endpoint)

```python
async def compute_full_score(building_id: str, db: AsyncSession) -> ViabilityScoreResult:
    # 1. Load all data for building
    building = await get_building_full(building_id, db)
    
    # 2. Compute sub-scores
    physical = compute_physical_score(building)
    economic = compute_economic_score(building)
    strategic = compute_strategic_score(building)
    
    # 3. Confidence composite
    confidence = compute_confidence(building)
    
    # 4. Final adjusted score
    v_raw = physical + economic + strategic
    v_adj = v_raw * (0.6 + 0.4 * confidence)
    
    # 5. WRAI
    wrai = compute_wrai(building)
    
    # 6. Genome archetype
    genome = classify_genome(physical, economic, strategic, building.ct_detected, wrai)
    
    # 7. Water Twin (default scenario)
    harvest = compute_water_twin(building.roof_sqft, building.annual_rain_inches, ...)
    
    # 8. Upsert to viability_scores table
    await upsert_viability_score(building_id, v_adj, physical, economic, strategic, wrai, genome, confidence, db)
    
    return ViabilityScoreResult(...)
```

---

## 8. TypeScript Scoring Module — `frontend/lib/scoring.ts`

Implement the EXACT same formulas in TypeScript for client-side use. This is used:
- Water Twin simulator live slider updates (no API call)
- WRAI badge display
- Genome classification display

The TypeScript implementation must produce the same numbers as Python to ±0.1 precision.

Export these functions:
```typescript
export function computePhysicalScore(building: BuildingDetail): number
export function computeEconomicScore(building: BuildingDetail): number
export function computeStrategicScore(building: BuildingDetail): number
export function computeConfidence(building: BuildingDetail): number
export function computeWRAI(building: BuildingDetail): number
export function classifyGenome(physical: number, economic: number, strategic: number, ctDetected: boolean, wrai: number): string
export function computeWaterTwin(params: WaterTwinParams): HarvestOutput
```

---

## 9. API Endpoint for Water Twin

`GET /api/building/{id}/harvest` calls `compute_water_twin()` with params from query string and returns the full `HarvestOutput`. All slider movements in the Water Twin UI call this endpoint debounced at 100ms. The TypeScript version is used for the very first render (instant) and the API version is called for each slider change (for accuracy and to avoid bundling heavy computation in the frontend).

---

## 10. Validation Checklist

Before moving to Phase 03, verify:
- [ ] Amazon FTW6 (295k sqft, ESG accelerator) scores ≥ 88
- [ ] Alliance Speedway (moderate ESG, flood zone) scores 65–75
- [ ] A D3 drought scenario reduces payback period by 10–20% vs normal year
- [ ] WRAI "Act Now" (≥80) correctly assigned to Data Centers and buildings in D2+ drought
- [ ] Genome archetypes are distinct across the 5 primary buildings
- [ ] Water Twin for a 142k sqft DFW building with 34" rain produces ~3.0M gallons/year
  - Calculation: 142,000 × 34 × 0.623 × 0.85 = ~2,558,948 gallons ✓ (use 0.85 runoff)
- [ ] IRR function returns non-negative values for all viable buildings
- [ ] TypeScript and Python Water Twin outputs match within 1%
