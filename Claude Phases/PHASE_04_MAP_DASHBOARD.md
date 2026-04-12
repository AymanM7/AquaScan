# PHASE 04 — Map Intelligence Dashboard
## Page: `/map`

**Prerequisite:** Phases 01–03 complete. Backend returning building data for Texas. Mapbox token configured.

---

## 1. Objective

Build the primary working interface — a full-screen, dark, mission-control map that is the beating heart of the entire product. Every visual interaction must feel alive. This page must demonstrate the product's core value in under 30 seconds without explanation.

Key requirements:
- Full-screen Mapbox satellite-style dark map
- Four deck.gl layers (heatmap, building polygons, cooling tower icons, rain particles)
- Alert Ticker at top
- Filter sidebar (collapsible)
- Building ranked table (slide-in drawer from right)
- Building polygon click → navigate to `/building/[id]`
- All map animations on state load (sequential bloom)
- Global Zustand store driving all state

---

## 2. Zustand Store — `store/buildingStore.ts`

```typescript
import { create } from 'zustand'

interface BuildingStore {
  // Map state
  selectedState: string             // 'TX' default
  activeFilters: FilterState
  selectedBuildingId: string | null
  mapViewport: { lat: number; lng: number; zoom: number }
  
  // Data
  buildings: BuildingSummary[]
  filteredBuildings: BuildingSummary[]
  isLoadingBuildings: boolean
  
  // UI state
  isSidebarOpen: boolean
  isRankedTableOpen: boolean
  
  // Actions
  setSelectedState: (state: string) => void
  setFilter: (key: keyof FilterState, value: any) => void
  resetFilters: () => void
  selectBuilding: (id: string | null) => void
  setBuildings: (buildings: BuildingSummary[]) => void
  applyFilters: () => void
  setMapViewport: (viewport: { lat: number; lng: number; zoom: number }) => void
  toggleSidebar: () => void
  toggleRankedTable: () => void
}

interface FilterState {
  minScore: number         // 0
  maxScore: number         // 100
  minRoofSqft: number      // 100000
  sectors: string[]        // [] = all
  coolingTower: 'all' | 'detected' | 'not_required'
  minDrought: number       // 0 = any
  wraiLevel: 'any' | 'monitor' | 'high' | 'act_now'
  incentiveRequired: boolean
}
```

`applyFilters()` filters `buildings` array client-side and updates `filteredBuildings`. All filter operations are synchronous — no API call after initial load.

---

## 3. Data Loading Strategy

On state select:
1. Call `GET /api/buildings?state=TX&limit=500`
2. Store all 500 buildings in Zustand
3. Apply default filters client-side
4. Render filtered set on map

The full state dataset is loaded once and cached in Zustand. Filters are 100% client-side. This enables instant filter response with no loading states during filter changes.

Use SWR for the initial fetch:
```typescript
const { data, isLoading } = useSWR(
  `/api/buildings?state=${selectedState}`,
  fetcher,
  { revalidateOnFocus: false }
)
```

---

## 4. Map Setup — `components/map/MapCanvas.tsx`

```tsx
// This is the root map component that composes all layers
import Map from 'react-map-gl'
import DeckGL from '@deck.gl/react'

const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11'  // dark streets + buildings

export function MapCanvas() {
  const { filteredBuildings, selectedBuildingId, selectBuilding, mapViewport } = useBuildingStore()
  
  const layers = [
    createHeatmapLayer(filteredBuildings),
    createBuildingPolygonLayer(filteredBuildings, selectedBuildingId, selectBuilding),
    createCoolingTowerIconLayer(filteredBuildings),
  ]
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DeckGL
        initialViewState={{ longitude: -97.03, latitude: 32.89, zoom: 9, pitch: 0, bearing: 0 }}
        controller={true}
        layers={layers}
        onClick={(info) => {
          if (!info.object) selectBuilding(null)
        }}
      >
        <Map
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          mapStyle={MAP_STYLE}
          reuseMaps
        />
      </DeckGL>
      
      {/* Rain overlay ON TOP of map */}
      <RainParticleOverlay buildings={filteredBuildings} />
    </div>
  )
}
```

---

## 5. Deck.gl Layers

### Layer 1 — Opportunity Heatmap
```typescript
// components/map/HeatmapLayer.tsx
import { HeatmapLayer } from '@deck.gl/aggregation-layers'

export function createHeatmapLayer(buildings: BuildingSummary[]) {
  return new HeatmapLayer({
    id: 'opportunity-heatmap',
    data: buildings.map(b => ({
      coordinates: [b.centroid_lng, b.centroid_lat],
      weight: b.final_score / 100
    })),
    getPosition: d => d.coordinates,
    getWeight: d => d.weight,
    radiusPixels: 60,
    intensity: 1.2,
    threshold: 0.1,
    colorRange: [
      [0, 40, 60, 0],           // transparent
      [0, 100, 150, 80],        // deep teal ghost
      [0, 229, 204, 140],       // teal
      [245, 166, 35, 180],      // amber
      [255, 200, 100, 220],     // bright amber
    ]
  })
}
```

### Layer 2 — Building Polygons (PRIMARY LAYER)
```typescript
// components/map/BuildingLayer.tsx
import { GeoJsonLayer } from '@deck.gl/layers'

export function createBuildingPolygonLayer(
  buildings: BuildingSummary[],
  selectedId: string | null,
  onSelect: (id: string) => void
) {
  // Color mapping by score
  const getColor = (b: BuildingSummary): [number,number,number,number] => {
    if (b.id === selectedId) return [255, 255, 255, 255]  // white when selected
    const s = b.final_score
    if (s >= 80) return [0, 229, 204, 255]     // bright teal
    if (s >= 60) return [55, 138, 221, 220]    // electric blue
    if (s >= 40) return [29, 158, 117, 200]    // muted teal
    return [40, 50, 60, 180]                    // near invisible dark
  }
  
  return new GeoJsonLayer({
    id: 'building-polygons',
    data: {
      type: 'FeatureCollection',
      features: buildings.map(b => ({
        type: 'Feature',
        geometry: b.polygon_geojson,
        properties: { id: b.id, score: b.final_score }
      }))
    },
    filled: true,
    stroked: true,
    getFillColor: (f) => getColor(buildings.find(b => b.id === f.properties.id)!),
    getLineColor: [0, 229, 204, 120],
    getLineWidth: 1,
    lineWidthMinPixels: 1,
    pickable: true,
    onClick: (info) => {
      if (info.object) {
        onSelect(info.object.properties.id)
      }
    },
    // Sequential bloom animation on data load
    transitions: {
      getFillColor: { duration: 800, type: 'spring' }
    },
    updateTriggers: {
      getFillColor: [selectedId, buildings.map(b => b.final_score).join(',')]
    }
  })
}
```

**Sequential bloom animation:** Sort buildings by `final_score DESC`. Use a staggered reveal by adding buildings to the layer data array one-by-one with 30ms intervals using `useEffect` + `setTimeout`. Start from an empty array and append each building in score order. Buildings "materialize" from highest to lowest score across the map.

### Layer 3 — Cooling Tower Icons
```typescript
import { IconLayer } from '@deck.gl/layers'

// SVG icon for cooling tower: spiral/vortex shape, 24x24
const ICON_ATLAS = '/icons/cooling-tower-atlas.png'  // sprite sheet
const ICON_MAPPING = {
  'cooling_tower': { x: 0, y: 0, width: 24, height: 24, mask: true }
}

export function createCoolingTowerIconLayer(buildings: BuildingSummary[]) {
  const ctBuildings = buildings.filter(b => b.ct_detected && b.ct_confidence > 0.7)
  
  return new IconLayer({
    id: 'cooling-tower-icons',
    data: ctBuildings,
    iconAtlas: ICON_ATLAS,
    iconMapping: ICON_MAPPING,
    getIcon: () => 'cooling_tower',
    getPosition: d => [d.centroid_lng, d.centroid_lat],
    getSize: 16,
    getColor: [245, 166, 35, 220],  // amber
    pickable: false
  })
}
```

### Layer 4 — Rain Particle Canvas Overlay
The rain canvas from the landing page is reused here with one addition: **polygon ripple detection**.

```typescript
// When a particle's (x, y) on screen falls within a building polygon's bounding box:
// 1. Look up the building (use a spatial index — simple bounding box lookup)
// 2. If building score >= 60: trigger a CSS ripple effect on that building
// Implementation: maintain a Map<buildingId, HTMLElement> for rendered polygons
// Add class 'rippling' for 800ms, then remove

// CSS:
// .rippling { animation: ripple 0.8s ease-out; }
// @keyframes ripple { 0% { opacity: 1; } 50% { box-shadow: 0 0 30px rgba(0,229,204,0.8); } 100% { opacity: 1; } }
```

For hackathon simplicity: skip actual polygon collision detection. Instead, maintain a list of bounding boxes for the top 20 buildings and check particle (x,y) against those screen-space bounding boxes.

---

## 6. Alert Ticker — `components/map/AlertTicker.tsx`

Fixed 48px bar at very top of the page (above the map). Background: `rgba(6, 13, 26, 0.9)`, `border-bottom: 1px solid rgba(0,229,204,0.2)`.

Content: a horizontally scrolling marquee of 15–20 pre-seeded alert events.

```tsx
// CSS animation approach (most performant for a marquee)
<div className="ticker-outer">
  <div className="ticker-inner">
    {alerts.concat(alerts).map((alert, i) => (   // doubled for seamless loop
      <span 
        key={i} 
        className={`ticker-item type-${alert.type}`}
        onClick={() => handleAlertClick(alert)}
      >
        {ALERT_ICONS[alert.type]} {alert.description} ·
      </span>
    ))}
  </div>
</div>

// CSS:
// .ticker-outer { overflow: hidden; white-space: nowrap; }
// .ticker-inner { display: inline-block; animation: scroll-left 45s linear infinite; }
// @keyframes scroll-left { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
// .type-drought { color: #FB7185; }
// .type-rate { color: #F5A623; }
// .type-incentive { color: #4ADE80; }
// .type-sec { color: #A78BFA; }
// .type-ordinance { color: #60A5FA; }
```

**On alert click:**
1. Find all `building_ids` in the alert
2. Map `flyTo` the centroid of those buildings
3. Highlight those buildings in orange for 2 seconds (temp color override in store)
4. Show a small tooltip/toast: "Score impact: +4.2 pts from drought escalation"

---

## 7. Filter Sidebar — `components/map/FiltersSidebar.tsx`

320px wide, collapsible, left side. Always rendered, slides in/out with Framer Motion `x: -320 → 0`.

```tsx
<motion.aside
  initial={{ x: -320 }}
  animate={{ x: isSidebarOpen ? 0 : -320 }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
  className="filter-sidebar"
>
  <div className="sidebar-header">
    <h3>Filter Opportunities</h3>
    <button onClick={resetFilters}>Reset</button>
  </div>
  
  {/* Viability Score range */}
  <FilterSection label="Viability Score">
    <RangeSlider min={0} max={100} value={[minScore, maxScore]} onChange={...} />
  </FilterSection>
  
  {/* Roof area */}
  <FilterSection label="Roof Area">
    <Select options={['100k+', '150k+', '200k+', '300k+']} />
  </FilterSection>
  
  {/* Sector */}
  <FilterSection label="Sector">
    <CheckboxGroup options={['Data Center', 'Logistics', 'Manufacturing', 'Hospital', 'University']} />
  </FilterSection>
  
  {/* Cooling Tower */}
  <FilterSection label="Cooling Tower">
    <RadioGroup options={['All', 'Detected', 'Not Required']} />
  </FilterSection>
  
  {/* Drought Severity */}
  <FilterSection label="Min Drought">
    <Select options={['Any', 'D1+', 'D2+', 'D3+']} />
  </FilterSection>
  
  {/* WRAI */}
  <FilterSection label="WRAI Level">
    <RadioGroup options={['Any', 'Monitor', 'High', 'Act Now']} />
  </FilterSection>
  
  {/* Results count */}
  <div className="filter-results">
    {filteredBuildings.length} buildings match
  </div>
</motion.aside>
```

Sidebar toggle: a floating button on the left edge of the map with an arrow icon.

---

## 8. Building Ranked Table — `components/map/BuildingRankedTable.tsx`

A slide-in drawer from the right (400px wide). Opens when user clicks a "View Rankings" button or selects a building.

```tsx
<motion.div
  initial={{ x: 400 }}
  animate={{ x: isRankedTableOpen ? 0 : 400 }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
  className="ranked-table-drawer"
>
  <TanstackTable
    data={filteredBuildings}
    columns={[
      { header: '#', cell: (row) => row.index + 1 },
      { header: 'Building', cell: (row) => <BuildingNameCell building={row.original} /> },
      { header: 'Score', cell: (row) => <ScoreRingMini score={row.original.final_score} /> },
      { header: 'Roof', cell: (row) => `${(row.original.roof_sqft/1000).toFixed(0)}k sqft` },
      { header: 'Gallons/yr', cell: (row) => `${(row.original.annual_gallons/1e6).toFixed(1)}M` },
      { header: 'Payback', cell: (row) => `${row.original.payback_years}yr` },
      { header: 'WRAI', cell: (row) => <WRAIBadge wrai={row.original.wrai} /> },
    ]}
    onRowClick={(row) => {
      selectBuilding(row.original.id)
      router.push(`/building/${row.original.id}`)
    }}
    virtualRows={true}   // @tanstack virtual for 500 rows
  />
</motion.div>
```

**Row highlight:** When a building is selected on the map, the corresponding row in the table highlights and scrolls into view.

---

## 9. Building Selection → Popup Card

When a building polygon is clicked on the map:
1. Building polygon turns white/highlighted
2. A popup card appears near the building centroid (not a browser tooltip — a custom React component positioned via `useMap`)
3. Popup shows: Name, Score ring (animated), Genome badge, 3 key stats
4. Two buttons: "View Details →" (routes to `/building/[id]`), "✕" (deselect)

```tsx
// components/map/BuildingPopup.tsx
// Positioned via Mapbox Popup or custom absolute positioning using map.project(lngLat)
// Framer Motion: scale from 0.8 to 1.0, opacity 0 to 1 on appear
// Spring physics, stiffness 400, damping 25
```

---

## 10. Map Page Layout — `app/map/page.tsx`

```tsx
export default function MapPage() {
  return (
    <div className="map-page">
      {/* Alert ticker — fixed top */}
      <AlertTicker />
      
      {/* Main layout below ticker */}
      <div className="map-layout">
        {/* Filter sidebar */}
        <FiltersSidebar />
        
        {/* Map fills remaining space */}
        <div className="map-container">
          <MapCanvas />
          
          {/* Building popup overlay */}
          <BuildingPopup />
          
          {/* Sidebar toggle button */}
          <SidebarToggle />
          
          {/* Rankings toggle button */}
          <RankingsToggle />
        </div>
        
        {/* Rankings drawer */}
        <BuildingRankedTable />
      </div>
      
      {/* Persistent widgets */}
      <WaterMeterWidget />
      <ElevenLabsDebriefPlayer />
      
      {/* App navigation */}
      <AppNav />
    </div>
  )
}
```

CSS for the layout:
```css
.map-page { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
.alert-ticker { flex-shrink: 0; height: 48px; }
.map-layout { display: flex; flex: 1; overflow: hidden; position: relative; }
.map-container { flex: 1; position: relative; }
```

---

## 11. Score Ring Mini Component — `components/shared/ViabilityScoreRing.tsx`

Used in the ranked table and building popups. Two sizes: `mini` (32px) and `full` (120px).

```tsx
interface ScoreRingProps {
  score: number
  size?: 'mini' | 'full'
  animated?: boolean
}

// SVG circle implementation:
// r = 14 (mini) or 52 (full)
// circumference = 2 * Math.PI * r
// stroke-dasharray = circumference
// stroke-dashoffset = circumference * (1 - score/100)
// animate from circumference to final value over 1.2s on mount
// Color: linear interpolation from coral (#FB7185) at 0 to teal (#00E5CC) at 100
```

---

## 12. WRAI Badge Component — `components/building/WRAIBadge.tsx`

```tsx
const WRAI_CONFIG = {
  act_now: { label: 'Act Now', color: '#FB7185', bg: 'rgba(251,113,133,0.15)' },
  high: { label: 'High Priority', color: '#F5A623', bg: 'rgba(245,166,35,0.15)' },
  monitor: { label: 'Monitor', color: '#60A5FA', bg: 'rgba(96,165,250,0.15)' },
  standard: { label: 'Standard', color: '#7A95B0', bg: 'rgba(122,149,176,0.15)' },
}

function getWRAILevel(wrai: number): keyof typeof WRAI_CONFIG {
  if (wrai >= 80) return 'act_now'
  if (wrai >= 60) return 'high'
  if (wrai >= 40) return 'monitor'
  return 'standard'
}
```

---

## 13. Genome Badge Component — `components/shared/GenomeBadge.tsx`

Color-coded pill for each archetype:
```typescript
const GENOME_COLORS = {
  'Storm-Value Titan': { bg: '#00E5CC20', text: '#00E5CC', border: '#00E5CC40' },
  'Cooling-Driven Reuse Giant': { bg: '#F5A62320', text: '#F5A623', border: '#F5A62340' },
  'ESG Mandate Accelerator': { bg: '#4ADE8020', text: '#4ADE80', border: '#4ADE8040' },
  'Hidden High-ROI Candidate': { bg: '#A78BFA20', text: '#A78BFA', border: '#A78BFA40' },
  'Flood-Resilience Priority': { bg: '#60A5FA20', text: '#60A5FA', border: '#60A5FA40' },
}
```

---

## 14. Performance Requirements

- Map must render 500 buildings without lag
- Filter changes must reflect on map in < 100ms
- Ranked table must handle 500 rows with virtual scrolling
- Rain particles must not drop below 60fps (profile and optimize canvas if needed)
- Initial map load (data fetch + render) < 2 seconds

---

## 15. Checklist Before Moving to Phase 05

- [ ] Map loads with DFW as default state
- [ ] All 55+ buildings visible as colored polygons
- [ ] Buildings bloom onto map sequentially by score on load
- [ ] Heatmap layer visible as teal-amber gradient
- [ ] Cooling tower icons visible on CT-detected buildings
- [ ] Rain particles fall continuously without lag
- [ ] Alert ticker scrolls with correct event descriptions
- [ ] Alert click → map flies to affected buildings
- [ ] All 8 filters work correctly (client-side instant)
- [ ] Ranked table slides in from right
- [ ] Table is sortable by all columns
- [ ] Building polygon click → popup appears
- [ ] "View Details" → routes to /building/[id]
- [ ] Score rings in table animate on first render
- [ ] WRAI badges display correct colors
- [ ] Genome badges display correct colors
- [ ] Water Waste Meter persists from landing page
