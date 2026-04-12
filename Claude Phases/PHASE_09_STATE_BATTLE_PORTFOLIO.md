# PHASE 09 — State Battle Arena & Portfolio Domino View
## Pages: `/compare`, `/portfolio/[owner]`

**Prerequisite:** Phases 01–08 complete. Backend seeded with multi-state data. `/api/states/:a/vs/:b` and `/api/portfolio/:owner` routes operational.

---

## 1. Objective

Build two high-impact "strategic lens" pages that expand the product's perceived value beyond individual buildings:

- **`/compare`** — A theatrical split-screen market intelligence battle between any two US states, with animated radar charts, winner badges, and an AI-generated market verdict
- **`/portfolio/[owner]`** — An enterprise account strategy view showing all buildings under one corporate owner, with a "First Domino" anchor recommendation and an animated arc constellation map

These are the demo moments that make judges think *"this isn't a building finder — it's a sales strategy platform."*

---

## 2. State Battle Arena — `app/compare/page.tsx`

### 2.1 Concept

A theatrical, live-demo-optimized screen. Designed to be used on a projector. Two states enter. One wins. The AI delivers the verdict. Every element animates on arrival. The page rewards showmanship.

### 2.2 Page Layout

```
┌───────────────────────────────────────────────────────────────────┐
│  [AppNav]                                               [/compare] │
├──────────────────────────┬──────────────────────────┤             │
│  STATE SELECTOR (LEFT)   │  STATE SELECTOR (RIGHT)               │
├──────────────────────────┼──────────────────────────┤             │
│                          │  ← glowing vertical divider →          │
│  [STATE A PANEL]         │  [STATE B PANEL]                       │
│  - SVG state silhouette  │  - SVG state silhouette                │
│  - Aggregate stats       │  - Aggregate stats                     │
│  - Winner badges         │  - Winner badges                       │
│  - Radar chart           │  - Radar chart                         │
│                          │                                         │
├──────────────────────────┴──────────────────────────┤             │
│  [AI VERDICT BANNER — spans full width]                            │
├───────────────────────────────────────────────────────────────────┤
│  Top 5 Buildings: [LEFT column]   │   Top 5 Buildings: [RIGHT]    │
└───────────────────────────────────────────────────────────────────┘
```

### 2.3 State Selector — `components/compare/StateSelector.tsx`

```tsx
// Two Radix UI Select dropdowns, one per side
// Options: all continental US state abbreviations
// Default: TX (left) and PA (right) — pre-selected for demo
// On change: invalidate SWR cache and re-fetch /api/states/{a}/vs/{b}
// Label: "SELECT STATE" in Space Mono 10px uppercase above each dropdown
// Dropdown styling: matches app dark theme, teal border on open state

interface StateSelectorProps {
  side: 'left' | 'right'
  selected: string
  onChange: (state: string) => void
  disabledState: string  // prevents selecting same state on both sides
}
```

### 2.4 State Panel — `components/compare/StatePanel.tsx`

Each panel is built from the `StateProfile` object returned by the API. Both panels are identical in structure — only the data differs.

**Panel entrance animation:**
```tsx
// Framer Motion — on mount (or when state changes):
// Left panel:  initial={{ x: -600, opacity: 0 }} → animate({ x: 0, opacity: 1 })
// Right panel: initial={{ x: 600, opacity: 0  }} → animate({ x: 0, opacity: 1 })
// Transition: { type: 'spring', stiffness: 90, damping: 18, duration: 0.7 }
// Stagger child elements by 80ms using `staggerChildren`
```

**Panel sections (top to bottom):**

**1. State Identity Block**
```tsx
// State abbreviation: Syne 72px, text-primary, letter-spacing: -2px
// State full name: IBM Plex 14px, text-secondary
// SVG state silhouette: 120px wide, filled with --color-accent-teal at 15% opacity,
//   stroked with --color-accent-teal at 60% opacity
// Below: total buildings count badge

// SVG silhouettes: pre-built SVG paths for TX, PA, AZ, CA, FL, NY (6 demo states)
// Other states: fallback rectangular placeholder with abbreviation centered
```

**2. Aggregate Stats Grid — `components/compare/StateStatsGrid.tsx`**
```tsx
// 2×3 grid of stat cards (same dark surface card style as building detail)
// Stats (sourced from StateProfile):
const STATS = [
  { label: 'Buildings >100k sqft',    key: 'total_buildings_over_100k',      color: 'teal'   },
  { label: 'Annual Opportunity',       key: 'total_annual_opportunity_gallons', color: 'blue',
    format: (v: number) => `${(v / 1e9).toFixed(1)}B gal`                                    },
  { label: 'Avg Viability Score',      key: 'avg_viability_score',             color: 'amber'  },
  { label: 'Top Incentive Value',      key: 'top_incentive_value_usd',
    format: (v: number) => `$${(v/1000).toFixed(0)}k`                                         },
  { label: 'Avg Drought Score',        key: 'avg_drought_score',               color: 'coral'  },
  { label: 'Top Building Score',       key: 'top_5_buildings[0].final_score',  color: 'green'  },
]

// Count-up animation on mount: useCountUp(targetValue, { duration: 1500ms, easing: 'easeOut' })
// Each stat card animates in 80ms after the previous one (Framer Motion staggerChildren)
```

**3. Winner Badges — `components/compare/WinnerBadges.tsx`**
```tsx
// Five categories compared between states:
const BATTLE_CATEGORIES = [
  { id: 'volume',      label: 'Volume 🏆',              key: 'total_annual_opportunity_gallons' },
  { id: 'roi',         label: 'ROI 🏆',                 key: 'avg_viability_score' },
  { id: 'regulation',  label: 'Regulatory Tailwind 🏆', key: 'radar_scores.regulation' },
  { id: 'corporate',   label: 'Corporate Readiness 🏆', key: 'radar_scores.corporate' },
  { id: 'resilience',  label: 'Climate Urgency 🏆',     key: 'avg_drought_score' },
]

// Each category: determined in the parent by comparing StateProfile[a] vs StateProfile[b]
// Winner side shows: gold trophy badge (✦ amber, outlined pill, "WINNER")
// Loser side: neutral gray "2nd" pill
// Tie: both show teal "TIE" pill

// Badge entrance: 400ms delay after panel animation, scale 0.5 → 1.0, spring
```

**4. Radar Chart — `components/compare/StateRadarChart.tsx`**
```tsx
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'

// Uses radar_scores from StateProfile: { volume, roi, regulation, corporate, resilience }
// Each axis value is 0–100

// Chart config:
const radarConfig = {
  data: Object.entries(profile.radar_scores).map(([key, val]) => ({
    subject: RADAR_LABELS[key],
    score: val,
  })),
}

// Styling:
// PolarGrid: stroke rgba(0,229,204,0.12)
// Left state radar: fill rgba(0,229,204,0.2), stroke #00E5CC
// Right state radar: fill rgba(245,166,35,0.2), stroke #F5A623
// When BOTH states are loaded, the TWO radar datasets overlay on ONE shared chart in the divider
// → see Section 2.6 for the merged overlay chart

// Animation: Recharts built-in `isAnimationActive={true}` + `animationBegin={600}`
```

### 2.5 Glowing Vertical Divider — `components/compare/BattleDivider.tsx`

```tsx
// Centered vertical line between the two panels:
// Width: 2px
// Background: linear-gradient(to bottom, transparent, #00E5CC, transparent)
// Box-shadow: 0 0 20px rgba(0,229,204,0.4)
// Height: 100% of the comparison section

// Center element on the divider:
// A circular "VS" badge — 56px diameter
// Background: --color-bg-surface-2
// Border: 2px solid --color-accent-teal
// Text: "VS" in Syne 20px, text-primary
// Box-shadow: 0 0 16px rgba(0,229,204,0.5)

// Below the VS badge (after both states loaded):
// "Generate Market Verdict" button — 160px wide, amber fill, Syne 13px
// Positioned absolutely at center of divider, vertically centered in the main panel area
```

### 2.6 Overlay Radar Chart (Both States Together)

When both states are selected and data is loaded, a **merged overlay chart** appears spanning the full width, centered on the divider:

```tsx
// Full-width Recharts RadarChart, 400px tall
// Two Radar datasets overlaid:
//   State A: fill rgba(0,229,204,0.15), stroke #00E5CC, strokeWidth: 2
//   State B: fill rgba(245,166,35,0.15), stroke #F5A623, strokeWidth: 2
// Legend: two color squares + state abbreviations
// PolarAngleAxis labels: Volume | ROI | Regulation | Corporate | Climate

// Animate: both datasets animate in simultaneously
// When a winner badge is confirmed for a category, the corresponding axis label on the radar
//   shows a small 🏆 suffix (string interpolation)
```

### 2.7 AI Verdict Banner — `components/compare/VerdictBanner.tsx`

After both states load:

```tsx
// A wide card spanning the full content area:
// Background: --color-bg-surface
// Border-top: 3px solid --color-accent-amber
// Padding: 24px 32px

// Before generate click:
<div className="verdict-cta">
  <p className="verdict-label">STRATEGIC INTELLIGENCE VERDICT</p>
  <button onClick={handleGenerateVerdict} className="verdict-btn">
    Generate Market Verdict →
  </button>
</div>

// Loading state (after click):
// Three-dot animated ellipsis, label "Analyzing market conditions..."

// After response:
// Verdict text renders with typewriter animation:
// character-by-character at 18ms per char using setInterval + substring slicing
// Typewriter cursor: blinking teal `|` appended to rendered text until complete

// Verdict format (from Claude API — 2–3 sentences):
// "Texas leads on volume and climate urgency, but Pennsylvania's $100k/acre incentives
//  and tighter stormwater regulation create a shorter deal cycle. Prioritize Texas for
//  Q1 pipeline volume; deploy a Pennsylvania pilot in Q2 to capture incentive windows
//  before the 2027 grant cycle closes."
```

**API call (from frontend):**
```tsx
// POST /api/states/{state_a}/vs/{state_b}/verdict
// Body: { profiles: { a: StateProfile, b: StateProfile } }
// Returns: { verdict: string }

// Claude prompt (server-side):
// System: "You are a water-market strategy analyst for Grundfos sales leadership..."
// User: "Compare {state_a} vs {state_b} using this data: {JSON.stringify(profiles)}.
//        Recommend which state to prioritize for commercial water-reuse sales in 1–2 sentences.
//        Mention specific data points. Be direct. No hedging."
// Model: claude-sonnet-4-6, max_tokens: 200, stream: true (SSE)
```

### 2.8 Top 5 Buildings — `components/compare/TopBuildingsList.tsx`

Two columns below the main comparison section:

```tsx
// Each column: a vertical stack of 5 compact BuildingCard components
// Compact BuildingCard shows:
//   - Building name (truncated to 30 chars)
//   - City
//   - Genome archetype badge (small colored pill)
//   - Score ring (small — 32px SVG circle)
//   - Annual gallons (abbreviated: "2.1M gal")
//   - onClick: router.push(`/building/${building.id}`)

// The #1 ranked card in each column:
//   - Slightly larger scale (1.02×)
//   - Gold left border: 3px solid --color-accent-amber
//   - Label above: "★ TOP PROSPECT" in Space Mono 10px amber caps

// Animate in: stagger 100ms per card, slide-up from +20px with opacity 0 → 1
```

### 2.9 State Battle Arena — Backend Route

Already specified in Phase 01, Section 7. Complete the implementation here:

```python
# routers/states.py
@router.get("/states/{state_a}/vs/{state_b}")
async def state_vs_state(state_a: str, state_b: str, db: AsyncSession = Depends(get_db)):
    """Returns StateProfile for both states"""
    profiles = {}
    for state in [state_a.upper(), state_b.upper()]:
        # Aggregate query:
        # COUNT(buildings where state=state AND roof_sqft >= 100000)
        # SUM(viability_scores.annual_gallons) for that state
        # AVG(viability_scores.final_score)
        # MAX(incentive_adapters.rebate_usd) for any city_id in that state
        # AVG(climate_data.drought_score)
        # SELECT TOP 5 buildings by final_score (with BuildingSummary join)
        # Compute radar_scores:
        #   volume: normalize SUM(gallons) vs US max → 0–100
        #   roi: AVG(final_score)
        #   regulation: custom formula: (max_incentive/1000 * 0.4) + (avg_stormwater_fee * 0.3) + mandate_count * 10
        #   corporate: AVG(corporate_data.esg_score) for that state's buildings
        #   resilience: AVG(climate_data.drought_score) * 10
        profiles[state] = StateProfile(...)
    return profiles

@router.post("/states/{state_a}/vs/{state_b}/verdict")
async def generate_verdict(state_a: str, state_b: str, body: VerdictRequest):
    """Claude-generated 2-sentence strategic verdict"""
    import anthropic
    client = anthropic.Anthropic()
    # Streaming SSE response back to frontend
    # Build prompt from body.profiles data
    # Return { verdict: string }
    ...
```

### 2.10 State Battle Arena — State Management

```tsx
// Zustand slice: useBattleStore
interface BattleStore {
  stateA: string
  stateB: string
  profileA: StateProfile | null
  profileB: StateProfile | null
  verdict: string | null
  verdictLoading: boolean
  setStateA: (s: string) => void
  setStateB: (s: string) => void
  setVerdict: (v: string) => void
  setVerdictLoading: (b: boolean) => void
  clear: () => void
}

// SWR key: `/api/states/${stateA}/vs/${stateB}` — auto-fetches when either state changes
// On stateA or stateB change: verdict is cleared (requires regeneration)
```

### 2.11 Demo Flow for `/compare`

```
1. Navigate to /compare — both selectors default to TX and PA
2. Data loads instantly (seeded) — panels fly in from left and right
3. Stats count up: 847 buildings, 4.1B gallons, Score 79.4 (TX) vs 382 buildings, 1.2B gallons, 73.1 (PA)
4. Winner badges appear: TX wins Volume + Climate, PA wins Regulation
5. Point at overlay radar chart: "TX is bigger. PA has better policy tailwinds."
6. Click "Generate Market Verdict" — typewriter animation plays
7. Read verdict aloud. Pivot: "Now let's look at what one enterprise deal really means."
8. Navigate to /portfolio/prologis
```

---

## 3. Portfolio Domino View — `app/portfolio/[owner]/page.tsx`

### 3.1 Concept

Enterprise account strategy. The question this page answers is: *"If we win this one building, how big is the real prize?"* The page reframes every individual building into part of a larger corporate portfolio opportunity, making the pitch feel like an enterprise sales motion rather than a one-off transaction.

### 3.2 URL Structure

```
/portfolio/prologis         → owner name slug (lowercased, hyphenated)
/portfolio/amazon           → another owner
/portfolio/hines-reit       → REITs by name

// URL resolution in API:
// GET /api/portfolio/{owner} → fuzzy match on corporate_data.corporate_parent
// OR: GET /api/portfolio/{owner}?cik=0001045810 → exact SEC CIK match
```

### 3.3 Page Layout

```
┌───────────────────────────────────────────────────────────┐
│ [AppNav]                                                   │
│                                                            │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ PORTFOLIO HEADER                                     │   │
│ │ Company name | Ticker | Portfolio stats strip        │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                            │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ PORTFOLIO MAP (Mapbox + deck.gl ArcLayer)            │   │
│ │ All owned buildings as markers + arc constellation   │   │
│ │ Height: 380px                                        │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                            │
│ ┌───────────────────────────────────────────────────┐     │
│ │ FIRST DOMINO CALLOUT (highlighted card)           │     │
│ └───────────────────────────────────────────────────┘     │
│                                                            │
│ ┌───────────────────────────────────────────────────┐     │
│ │ RANKED BUILDINGS TABLE (full list)                │     │
│ └───────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────┘
```

### 3.4 Portfolio Header — `components/portfolio/PortfolioHeader.tsx`

```tsx
// Data: PortfolioView from API
// Layout: horizontal strip, full-width dark card

<div className="portfolio-header">
  
  {/* Left: Company identity */}
  <div className="portfolio-identity">
    <h1 className="portfolio-company-name">{portfolio.owner_name}</h1>
    {portfolio.ticker && (
      <span className="portfolio-ticker">NYSE: {portfolio.ticker}</span>
    )}
    {portfolio.corporate_parent !== portfolio.owner_name && (
      <p className="portfolio-parent">A {portfolio.corporate_parent} Property</p>
    )}
  </div>
  
  {/* Right: Portfolio stats strip */}
  <div className="portfolio-stats-strip">
    <PortfolioStat label="Buildings" value={portfolio.building_count} />
    <PortfolioStat label="Combined Roof Area"
                   value={`${(portfolio.combined_roof_sqft / 1e6).toFixed(1)}M sqft`} />
    <PortfolioStat label="Annual Opportunity"
                   value={`${(portfolio.combined_annual_gallons / 1e9).toFixed(1)}B gal`} />
    <PortfolioStat label="Annual Savings Potential"
                   value={`$${(portfolio.combined_potential_savings_usd / 1e6).toFixed(1)}M`}
                   highlight />
  </div>
  
</div>

// Styling:
// Company name: Syne 36px text-primary
// Ticker: Space Mono 13px text-secondary, background rgba(0,229,204,0.08), padded pill
// Stats strip: 4 cards in a row, each with teal value + gray label (IBM Plex 12px)
// highlight stat: value in --color-accent-teal with glow text-shadow
```

### 3.5 Portfolio Map — `components/portfolio/PortfolioMap.tsx`

```tsx
// Mapbox map, 380px tall, full-width, dark satellite style
// Layers:
//   1. ScatterplotLayer: all portfolio buildings as glowing teal dots
//      - radiusMinPixels: 8, radiusMaxPixels: 16
//      - getFillColor: score-based: ≥80 teal, 60–79 amber, <60 coral
//      - getRadius: roof_sqft / 5000 (larger roofs = larger dots)
//   2. ArcLayer: arcs from all buildings to the first_domino_building
//      - getSourcePosition: [lng, lat] of each building
//      - getTargetPosition: [lng, lat] of first domino
//      - getWidth: 2
//      - getSourceColor: [0, 229, 204, 80]   (teal, semi-transparent)
//      - getTargetColor: [0, 229, 204, 220]  (teal, bright at target)

// Animation sequence on page load:
// 1. Map flies to first_domino_building (flyTo, duration 1200ms)
// 2. First domino marker pulses (scale 1.0 → 1.5 → 1.0, repeat 2×)
// 3. After 1400ms: map zooms out to fit all buildings (fitBounds, duration 1800ms)
// 4. After zoom-out complete: ArcLayer renders with animated stroke (deck.gl transition)

// Tooltip on hover: building name, city, score, "First Domino" badge if applicable
// onClick: router.push(`/building/${building.id}`)
```

### 3.6 First Domino Callout — `components/portfolio/FirstDominoCard.tsx`

```tsx
// The most visually prominent element on the page after the map
// Full-width highlighted card with amber/teal gradient border

<div className="first-domino-card">
  
  <div className="domino-badge">
    🎯 START HERE — FIRST DOMINO
  </div>
  
  <div className="domino-content">
    <div className="domino-building-info">
      <h2>{building.name}</h2>
      <p>{building.address}, {building.city}, {building.state}</p>
      <div className="domino-score-row">
        <ScoreRing score={building.final_score} size={48} />
        <GenomeBadge archetype={building.genome_archetype} />
        <WRAIBadge wrai={building.wrai} />
      </div>
    </div>
    
    <div className="domino-narrative">
      <p>{portfolio.first_domino_narrative}</p>
      {/* Example: "Winning this Dallas facility opens 7 similar sites across the same Prologis
          portfolio representing $4.2M in combined annual water savings." */}
    </div>
    
    <div className="domino-actions">
      <button onClick={() => router.push(`/building/${portfolio.first_domino_building_id}`)}>
        Open Intelligence Brief →
      </button>
      <button onClick={() => router.push(`/dealroom/${portfolio.first_domino_building_id}`)}>
        Open Dealroom →
      </button>
    </div>
  </div>
  
</div>

// Styling:
// Card background: --color-bg-surface
// Border: 2px solid with gradient from --color-accent-amber to --color-accent-teal
// Domino badge: amber pill, Space Mono 11px uppercase
// Narrative text: IBM Plex 15px, line-height 1.7, text-secondary
// Action buttons: primary (teal filled) + secondary (outlined)
// Left accent bar: 4px width, amber-to-teal vertical gradient
```

### 3.7 Ranked Buildings Table — `components/portfolio/PortfolioBuildingsTable.tsx`

```tsx
import { useReactTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'

// Columns:
const columns = [
  { header: 'Rank',      accessorKey: 'rank',            cell: RankCell },
  { header: 'Building',  accessorKey: 'name',            cell: BuildingNameCell },
  { header: 'City',      accessorKey: 'city' },
  { header: 'Genome',    accessorKey: 'genome_archetype', cell: GenomeBadgeCell },
  { header: 'Score',     accessorKey: 'final_score',      cell: ScoreRingCell },
  { header: 'Roof sqft', accessorKey: 'roof_sqft',        cell: FormattedNumberCell },
  { header: 'Gal/yr',   accessorKey: 'annual_gallons',   cell: GallonsCell },
  { header: 'Payback',  accessorKey: 'payback_years',    cell: PaybackCell },
  { header: 'WRAI',     accessorKey: 'wrai',             cell: WRAIBadgeCell },
  { header: '',          id: 'actions',                   cell: ActionsCell },
]

// Row #1 (first domino): background rgba(245,166,35,0.06), left border 3px amber
// Other rows: alternating bg-surface / bg-surface-2
// Sortable by: Score, Roof sqft, Gallons, Payback
// ActionsCell: "View" → /building/id, "Dealroom" → /dealroom/id

// Empty state: skeleton loader while data loads (5 rows of pulsing gray bars)
```

### 3.8 Portfolio Backend Route — `routers/states.py` (extend)

```python
@router.get("/portfolio/{owner}")
async def get_portfolio(owner: str, cik: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """
    Returns all buildings under a corporate owner, ranked by viability score.
    owner: URL slug — match against corporate_data.corporate_parent (case-insensitive fuzzy)
    cik: optional SEC CIK for exact match
    """
    # 1. Resolve owner to corporate_parent name:
    #    SELECT DISTINCT corporate_parent FROM corporate_data
    #    WHERE LOWER(corporate_parent) LIKE LOWER('%{owner}%')
    #    OR sec_cik = cik

    # 2. Fetch all building_ids with that corporate_parent:
    #    JOIN buildings + corporate_data + viability_scores
    #    ORDER BY final_score DESC

    # 3. Compute aggregates:
    #    building_count, combined_roof_sqft, combined_annual_gallons, combined_potential_savings

    # 4. Identify first_domino_building_id = buildings[0].id (highest score)

    # 5. Generate first_domino_narrative (static template, not AI, for speed):
    #    f"Winning {buildings[0].name} in {buildings[0].city} opens {len(buildings)-1} similar
    #      sites across the same {resolved_parent} portfolio representing
    #      ${total_savings/1e6:.1f}M in combined annual water savings."

    return PortfolioView(
        owner_name=resolved_parent,
        corporate_parent=resolved_parent,
        ticker=buildings[0].corporate_data.ticker,
        building_count=len(buildings),
        combined_roof_sqft=sum(b.roof_sqft for b in buildings),
        combined_annual_gallons=sum(b.annual_gallons for b in buildings),
        combined_potential_savings_usd=sum(b.payback_savings for b in buildings),
        first_domino_building_id=str(buildings[0].id),
        first_domino_narrative=narrative,
        buildings=[BuildingSummary.from_orm(b) for b in buildings]
    )
```

### 3.9 Demo Seed Data for Portfolio View

The seed script (Phase 01) must include at least one owner with 5+ buildings. Use **Prologis**:

```json
// In dfw_buildings.json, ensure 5 buildings have:
{
  "corporate_parent": "Prologis Inc.",
  "ticker": "PLD",
  "sec_cik": "0001045810",
  "owner_name": "Prologis LP"
}

// Buildings: PL_DFW_001 through PL_DFW_006
// Scores: 89, 84, 79, 73, 68, 61 (descending — tells a story)
// Cities: Dallas, Dallas, Irving, Fort Worth, Garland, Arlington (geographic spread)
```

Access: `/portfolio/prologis` — slug `prologis` fuzzy-matches `Prologis Inc.`

### 3.10 State Management

```tsx
// No dedicated Zustand slice needed — SWR handles caching
// Portfolio page:
const { data: portfolio, isLoading } = useSWR(
  `/api/portfolio/${params.owner}`,
  fetcher,
  { revalidateOnFocus: false }
)

// Map arc animation triggered via useEffect on portfolio load
// Framer Motion presence wrapper handles enter/exit animations for all cards
```

---

## 4. Shared Components Introduced in Phase 09

### `components/shared/ScoreRing.tsx` (if not already built in Phase 05)
```tsx
// SVG circle ring showing a 0–100 score
// size prop: 32 | 48 | 64 | 96 (px)
// strokeColor: score-based (teal ≥80, amber 60–79, coral <60)
// Animated on mount: stroke-dashoffset 0 → score-derived offset over 1.2s
```

### `components/shared/GenomeBadge.tsx` (if not already built)
```tsx
// Small colored pill showing genome archetype
const ARCHETYPE_COLORS = {
  'Storm-Value Titan':          '#00E5CC',
  'Cooling-Driven Reuse Giant': '#F5A623',
  'ESG Mandate Accelerator':    '#4ADE80',
  'Hidden High-ROI Candidate':  '#A78BFA',
  'Flood-Resilience Priority':  '#60A5FA',
}
// Pill: 6px border-radius, 11px Space Mono text, colored background at 15% opacity, colored border
```

### `components/shared/WRAIBadge.tsx` (if not already built)
```tsx
// WRAI badge: shows numeric value + label
// ≥80: "Act Now" — red fill, coral text
// 60–79: "High Priority" — amber fill
// <60: no label variant
```

---

## 5. Checklist Before Moving to Phase 10

- [ ] `/compare` default-loads TX vs PA with animated panel entrance
- [ ] Count-up animations fire on data load
- [ ] Winner badges appear for all 5 categories
- [ ] Overlay radar chart renders both states' data
- [ ] "Generate Market Verdict" triggers Claude API and typewriter animation plays
- [ ] Top-5 building columns load and #1 card has gold border
- [ ] Clicking a building card routes to `/building/[id]`
- [ ] Changing a state selector re-fetches data and re-animates
- [ ] `/portfolio/prologis` loads with 6 Prologis buildings
- [ ] Portfolio header shows combined stats correctly
- [ ] Portfolio map shows all buildings with arcs to first domino
- [ ] Map animation sequence: fly-to → zoom-out → arcs appear
- [ ] First Domino card shows correct narrative text
- [ ] Ranked table is sortable by score, roof, and gallons
- [ ] "Open Intelligence Brief" routes to building detail
- [ ] "Open Dealroom" routes to dealroom (Auth0 gated)
- [ ] Page loads in under 2 seconds on seeded data
