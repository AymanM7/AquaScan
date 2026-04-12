# PHASE 10 — Opportunity Shock Feed & Live Water Waste Meter
## Page: `/feed` · Widget: `WaterWasteMeter` (global)

**Prerequisite:** Phases 01–09 complete. Alert events seeded. Global layout shell in place.

---

## 1. Objective

Build two interrelated features that create urgency and signal that RainUSE Nexus is a **live intelligence product**, not a static database:

1. **`/feed`** — The Opportunity Shock Feed: a real-time market intelligence event stream, structured like a financial news terminal crossed with a climate alert system. Simulates live data injection during the demo.

2. **`WaterWasteMeter`** — A persistent floating widget that appears on all pages, ticking up water waste in real-time, acting as a psychological pressure instrument and a constant call-to-action.

These two features are the emotional backbone of the demo: they make urgency visible, quantify the cost of inaction, and signal that the platform is always watching.

---

## 2. Opportunity Shock Feed — `app/feed/page.tsx`

### 2.1 Concept

A scrollable, filterable feed of market intelligence events that affect building Viability Scores across Grundfos's territory. Each event is sourced from the alert system (seeded in Phase 01) and displayed as a structured card with type-coded color accents, score impact data, and direct links to affected buildings on the map.

During the demo, new events are periodically injected from a pre-written queue to simulate a live data stream. The effect is that the platform appears to be continuously monitoring for you.

### 2.2 Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [AppNav with notification dot on "Feed" link]                │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ FEED HEADER                                           │    │
│ │ "Opportunity Shock Feed" | Last updated: timestamp    │    │
│ │ [Filters: ALL | DROUGHT | RATE | INCENTIVE | SEC | REG] │  │
│ │ [State filter: ALL | TX | PA | AZ | CA | ...]         │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
│ [LIVE INJECTION BANNER — appears on new event]               │
│                                                              │
│ [Event Card 1 — newest]                                      │
│ [Event Card 2]                                               │
│ [Event Card 3]                                               │
│ [...]                                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Feed Header — `components/feed/FeedHeader.tsx`

```tsx
<div className="feed-header">
  
  <div className="feed-title-row">
    <h1 className="feed-title">Opportunity Shock Feed</h1>
    <div className="feed-live-indicator">
      <span className="live-dot" />   {/* pulsing teal dot, CSS @keyframes */}
      <span className="live-label">LIVE</span>
    </div>
    <p className="feed-last-updated">
      Last updated: {formatRelative(lastUpdated, new Date())}
    </p>
  </div>
  
  {/* Type filter row */}
  <div className="feed-filters">
    {FEED_TYPES.map(type => (
      <button
        key={type.id}
        className={`feed-filter-pill ${activeType === type.id ? 'active' : ''}`}
        onClick={() => setActiveType(type.id)}
        style={{ '--pill-color': type.color } as React.CSSProperties}
      >
        {type.icon} {type.label}
      </button>
    ))}
  </div>
  
  {/* State filter */}
  <div className="feed-state-filter">
    <span className="filter-label">STATE:</span>
    <Select value={activeState} onValueChange={setActiveState}>
      <SelectItem value="ALL">All States</SelectItem>
      <SelectItem value="TX">Texas</SelectItem>
      <SelectItem value="PA">Pennsylvania</SelectItem>
      <SelectItem value="AZ">Arizona</SelectItem>
    </Select>
  </div>
  
</div>
```

**Filter type config:**
```tsx
const FEED_TYPES = [
  { id: 'all',       label: 'All',       icon: '🌐', color: '#7A95B0' },
  { id: 'drought',   label: 'Drought',   icon: '🔴', color: '#FB7185' },
  { id: 'rate',      label: 'Rate',      icon: '🟡', color: '#F5A623' },
  { id: 'incentive', label: 'Incentive', icon: '🟢', color: '#4ADE80' },
  { id: 'sec',       label: 'SEC',       icon: '📄', color: '#A78BFA' },
  { id: 'ordinance', label: 'Regulation',icon: '⚖️', color: '#60A5FA' },
]

// Active pill styling: background = pill-color at 18% opacity, border 1px solid pill-color
// Inactive: background transparent, border 1px solid rgba(122,149,176,0.25)
```

**Filter logic (client-side):**
```tsx
const filteredEvents = useMemo(() => {
  return events
    .filter(e => activeType === 'all' || e.type === activeType)
    .filter(e => activeState === 'ALL' || e.state === activeState)
}, [events, activeType, activeState])
```

### 2.4 Event Card — `components/feed/EventCard.tsx`

```tsx
interface AlertEvent {
  id: string
  type: 'drought' | 'rate' | 'incentive' | 'sec' | 'ordinance'
  state: string
  city: string
  headline: string
  description: string
  building_ids: string[]
  score_delta: number
  source: string
  source_url?: string
  event_timestamp: string
  is_new?: boolean   // injected during demo simulation
}

// Card anatomy:
<motion.div
  className={`event-card event-card--${event.type} ${event.is_new ? 'event-card--new' : ''}`}
  initial={event.is_new ? { y: -40, opacity: 0 } : { opacity: 1 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
  layout  // enables list reordering animation
>
  
  {/* Left accent bar: 4px wide, color matches event type */}
  <div className="event-type-bar" style={{ background: TYPE_COLORS[event.type] }} />
  
  <div className="event-body">
    
    <div className="event-header-row">
      <span className="event-type-icon">{TYPE_ICONS[event.type]}</span>
      <h3 className="event-headline">{event.headline}</h3>
      <span className="event-timestamp">{formatRelative(event.event_timestamp, new Date())}</span>
    </div>
    
    <p className="event-description">{event.description}</p>
    
    <div className="event-meta-row">
      
      {/* Score impact badge */}
      <div className={`score-delta-badge ${event.score_delta > 0 ? 'positive' : 'negative'}`}>
        {event.score_delta > 0 ? '↑' : '↓'} {Math.abs(event.score_delta).toFixed(1)} pts avg
      </div>
      
      {/* Buildings affected */}
      <div className="affected-buildings">
        <span>{event.building_ids.length} building{event.building_ids.length !== 1 ? 's' : ''} affected</span>
        <button
          className="view-on-map-btn"
          onClick={() => handleViewOnMap(event.building_ids)}
        >
          View on Map →
        </button>
      </div>
      
      {/* Source attribution */}
      <div className="event-source">
        Source: {event.source_url
          ? <a href={event.source_url} target="_blank">{event.source}</a>
          : <span>{event.source}</span>
        }
      </div>
      
    </div>
    
  </div>
  
</motion.div>
```

**Event card color scheme by type:**
```tsx
const TYPE_COLORS: Record<string, string> = {
  drought:   '#FB7185',   // coral — danger/urgency
  rate:      '#F5A623',   // amber — financial signal
  incentive: '#4ADE80',   // green — opportunity
  sec:       '#A78BFA',   // purple — corporate signal
  ordinance: '#60A5FA',   // blue — regulatory
}

// Unread / is_new cards: add outer box-shadow in the event type color at 30% opacity
// "new" label: Space Mono 10px "NEW" badge in top-right corner, type-color background
```

**"View on Map" behavior:**
```tsx
// On click:
// 1. router.push('/map') — navigate to map page
// 2. useMapStore.setState({ highlightedBuildingIds: event.building_ids, highlightSource: 'feed' })
// 3. On map page: useEffect watches highlightedBuildingIds
//    → map fitBounds to those buildings
//    → buildings pulse orange for 2000ms (deck.gl transition)
//    → score panel shows "Score changed by +X.X pts due to [event headline]"
```

### 2.5 Live Demo Simulation — `hooks/useFeedSimulation.ts`

During the demo, new events are injected at 45-second intervals to simulate live monitoring:

```tsx
// Pre-written queue of 5–8 future events that haven't appeared yet:
const DEMO_QUEUE: AlertEvent[] = [
  {
    id: 'demo-inject-1',
    type: 'drought',
    state: 'TX',
    city: 'Dallas',
    headline: 'Dallas County elevated to D3 — Extreme Drought conditions',
    description: 'USDA Drought Monitor D3 classification now covers 78% of Dallas County. 14 buildings have been re-evaluated. Avg viability score increase: +8.4 pts.',
    building_ids: ['uuid-b001', 'uuid-b002', 'uuid-b003'],  // seeded IDs
    score_delta: 8.4,
    source: 'US Drought Monitor',
    source_url: 'https://droughtmonitor.unl.edu',
    event_timestamp: new Date().toISOString(),
    is_new: true,
  },
  // ... 4–7 more events
]

export function useFeedSimulation(
  enabled: boolean,
  onNewEvent: (event: AlertEvent) => void
) {
  const queueRef = useRef([...DEMO_QUEUE])
  
  useEffect(() => {
    if (!enabled) return
    
    const interval = setInterval(() => {
      const next = queueRef.current.shift()
      if (next) {
        onNewEvent({ ...next, event_timestamp: new Date().toISOString() })
      }
    }, 45_000)
    
    return () => clearInterval(interval)
  }, [enabled, onNewEvent])
}
```

**Live Injection Banner — `components/feed/LiveInjectionBanner.tsx`:**
```tsx
// Appears for 4 seconds when a new event is injected:
<AnimatePresence>
  {showBanner && (
    <motion.div
      className="live-injection-banner"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
    >
      🔔 New intelligence event detected — feed updated
    </motion.div>
  )}
</AnimatePresence>

// Also: nav link badge — when a new event is injected, the "Feed" nav link shows
// a red notification dot that clears when the user visits /feed
```

**Nav notification dot:**
```tsx
// In AppNav.tsx, add:
// useEffect: if feed has unread simulated events → set feedHasNew: true in Zustand
// Nav item: <FeedNavItem hasNew={feedHasNew} />
// Dot: 8px circle, coral fill, absolute-positioned top-right of nav icon
// Clears on: route change to /feed (useEffect cleanup)
```

### 2.6 Feed Backend Route — `routers/alerts.py` (extend from Phase 01)

```python
# GET /api/alerts?state={}&type={}&limit={}
@router.get("/alerts")
async def get_alerts(
    state: Optional[str] = None,
    type: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    query = select(AlertEvent).order_by(AlertEvent.event_timestamp.desc()).limit(limit)
    if state:
        query = query.where(AlertEvent.state == state.upper())
    if type:
        query = query.where(AlertEvent.type == type)
    
    events = await db.execute(query)
    return { "data": events.scalars().all(), "count": ... }
```

All alert data is pre-seeded in Phase 01. No external API calls required for the feed — the simulation is frontend-only.

### 2.7 Feed State Management

```tsx
// Zustand slice: useFeedStore
interface FeedStore {
  events: AlertEvent[]
  feedHasNew: boolean
  activeType: string
  activeState: string
  lastUpdated: Date | null
  addEvent: (event: AlertEvent) => void
  setActiveType: (t: string) => void
  setActiveState: (s: string) => void
  markFeedRead: () => void
}

// On mount: SWR fetches initial events from /api/alerts
// useFeedSimulation hook adds events to store via addEvent
// Events are sorted: newest first (by event_timestamp)
```

---

## 3. Live Water Waste Meter — `components/shared/WaterWasteMeter.tsx`

### 3.1 Concept

A persistent floating widget anchored to the **bottom-right corner** of every page. It shows a counter ticking upward in real-time, computing how much harvestable water is being wasted right now across all unoptimized commercial buildings in Texas. The number is mathematically grounded (annual waste ÷ seconds/year). The psychological effect is immediate: water is flowing away while the user watches.

This is the most visceral feature in the entire application. It makes the problem undeniable.

### 3.2 Component Location

```
components/shared/WaterWasteMeter.tsx   ← the widget itself
app/layout.tsx                          ← include globally, outside any route
```

### 3.3 The Math

```ts
// All unoptimized TX buildings: 847 buildings with avg roof 180,000 sqft
// Annual rain: 34 inches (DFW average)
// Annual gallons per building: 180,000 × 34 × 0.623 × 0.85 = ~3.25M gal
// Total annual waste: 847 × 3.25M = ~2.75B gallons/year
// Per-second waste rate: 2.75B / (365 × 24 × 3600) = ~87.1 gallons/second

const WASTE_RATE_PER_SECOND = 87.1   // gallons/second across all TX buildings
const POOLS_PER_YEAR = 2_750_000_000 / 660_000  // Olympic pool = 660,000 gal → ~4,166 pools/yr

// On mount, the counter initializes to (time since midnight UTC) × WASTE_RATE_PER_SECOND
// This makes the number feel like it's been running all day, not resetting on load
function getInitialWaste(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setUTCHours(0, 0, 0, 0)
  const secondsSinceMidnight = (now.getTime() - midnight.getTime()) / 1000
  return Math.floor(secondsSinceMidnight * WASTE_RATE_PER_SECOND)
}
```

### 3.4 Component Implementation

```tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

export function WaterWasteMeter() {
  const [gallons, setGallons] = useState(getInitialWaste)
  const [minimized, setMinimized] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()
  const intervalRef = useRef<NodeJS.Timeout>()
  
  useEffect(() => {
    // Tick every 50ms for smooth animation
    // Each tick: add WASTE_RATE_PER_SECOND × 0.05 gallons
    intervalRef.current = setInterval(() => {
      setGallons(prev => prev + WASTE_RATE_PER_SECOND * 0.05)
    }, 50)
    return () => clearInterval(intervalRef.current)
  }, [])
  
  if (dismissed) return null
  
  const pools = (gallons / 660_000).toFixed(1)
  const displayGallons = Math.floor(gallons).toLocaleString('en-US')
  
  return (
    <AnimatePresence>
      <motion.div
        className="water-waste-meter"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ delay: 2.5, type: 'spring', stiffness: 80 }}
      >
        
        {minimized ? (
          // Minimized pill:
          <div className="meter-pill" onClick={() => setMinimized(false)}>
            <span className="meter-drop">💧</span>
            <span className="meter-pill-count">{displayGallons} gal wasted</span>
          </div>
        ) : (
          // Full widget:
          <div className="meter-full">
            
            <div className="meter-header">
              <span className="meter-label">💧 WATER BEING WASTED RIGHT NOW</span>
              <div className="meter-controls">
                <button onClick={() => setMinimized(true)} className="meter-minimize">—</button>
                <button onClick={() => setDismissed(true)} className="meter-dismiss">✕</button>
              </div>
            </div>
            
            <div className="meter-counter">
              {/* Each digit rendered as an individual span for individual animation */}
              <CountingDisplay value={Math.floor(gallons)} />
              <span className="meter-unit"> gal</span>
            </div>
            
            <div className="meter-subtitle">
              In unoptimized TX commercial buildings today
            </div>
            
            <div className="meter-pools">
              = {pools} Olympic swimming pools this year
            </div>
            
            <button
              className="meter-reclaim-btn"
              onClick={() => {
                router.push('/map?filter=top20capture')
              }}
            >
              Reclaim It →
            </button>
            
          </div>
        )}
        
      </motion.div>
    </AnimatePresence>
  )
}
```

### 3.5 CountingDisplay — Digit Flip Animation

```tsx
// Each digit animates individually when it changes (slot-machine style)
function CountingDisplay({ value }: { value: number }) {
  const digits = value.toLocaleString('en-US').split('')
  
  return (
    <div className="counting-display">
      {digits.map((char, i) => (
        char === ',' ? (
          <span key={i} className="digit-comma">,</span>
        ) : (
          <motion.span
            key={`${i}-${char}`}
            className="digit"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.08 }}
          >
            {char}
          </motion.span>
        )
      ))}
    </div>
  )
}
```

### 3.6 Styling

```css
.water-waste-meter {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 900;  /* below nav overlays, above map */
  width: 280px;
}

.meter-full {
  background: var(--color-bg-surface);
  border: 1px solid rgba(0, 229, 204, 0.25);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 24px rgba(0, 229, 204, 0.08);
}

.meter-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: var(--color-text-secondary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.meter-counter {
  font-family: 'Space Mono', monospace;
  font-size: 22px;
  color: var(--color-accent-teal);
  font-weight: 700;
  margin: 8px 0 4px;
  /* Subtle glow on the number */
  text-shadow: 0 0 12px rgba(0, 229, 204, 0.5);
}

.meter-unit {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.meter-subtitle {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.meter-pools {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 11px;
  color: var(--color-accent-blue);
  margin-bottom: 12px;
}

.meter-reclaim-btn {
  width: 100%;
  padding: 8px 0;
  background: rgba(0, 229, 204, 0.12);
  border: 1px solid rgba(0, 229, 204, 0.4);
  border-radius: 6px;
  color: var(--color-accent-teal);
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
}

.meter-reclaim-btn:hover {
  background: rgba(0, 229, 204, 0.2);
  box-shadow: 0 0 12px rgba(0, 229, 204, 0.25);
}

.meter-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg-surface);
  border: 1px solid rgba(0, 229, 204, 0.2);
  border-radius: 24px;
  padding: 8px 14px;
  cursor: pointer;
}

.meter-pill-count {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  color: var(--color-accent-teal);
}
```

### 3.7 Global Layout Integration

```tsx
// app/layout.tsx
import { WaterWasteMeter } from '@/components/shared/WaterWasteMeter'
import { ElevenLabsDebriefPlayer } from '@/components/shared/ElevenLabsDebriefPlayer'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <WaterWasteMeter />
        <ElevenLabsDebriefPlayer />
      </body>
    </html>
  )
}
```

### 3.8 "Reclaim It" Map Filter

When the user clicks "Reclaim It →":
```tsx
// router.push('/map?filter=top20capture')
// On map page: useEffect parses searchParams
// If filter === 'top20capture':
//   → Apply filter: top 20 buildings by annual_gallons DESC
//   → Fly map to fit those buildings
//   → Open ranked table drawer showing these 20
//   → Show filter chip: "🔁 Top 20 Capture Opportunities" (clearable)
```

---

## 4. Alert Ticker (Map Page Integration)

While the ticker itself lives in Phase 04 (Map Dashboard), it draws from the same alert data. Ensure the following integration is confirmed:

```tsx
// components/map/AlertTicker.tsx — if not already complete from Phase 04:

// Data: same AlertEvent[] from /api/alerts?state=TX&limit=20
// Render: CSS marquee scroll animation
// Each item: {typeIcon} {headline} · {score_delta > 0 ? '↑' : '↓'}{|score_delta|} pts ·
// Color-coded by type
// Click: handleViewOnMap(event.building_ids) — same behavior as feed cards

// CSS scroll animation:
// @keyframes ticker-scroll {
//   from { transform: translateX(100vw); }
//   to   { transform: translateX(-100%); }
// }
// duration: 40s, timing: linear, iteration: infinite
// On hover: animation-play-state: paused (so users can read)
```

---

## 5. Feed Page — Complete SWR + State Integration

```tsx
// app/feed/page.tsx — complete structure:

'use client'
import { useFeedStore } from '@/store/feedStore'
import { useFeedSimulation } from '@/hooks/useFeedSimulation'

export default function FeedPage() {
  const { events, addEvent, activeType, activeState, markFeedRead,
          setActiveType, setActiveState } = useFeedStore()
  
  // Initial fetch
  const { data: initialEvents } = useSWR('/api/alerts?limit=50', fetcher, {
    onSuccess: (data) => {
      if (events.length === 0) {  // only hydrate if store empty
        useFeedStore.setState({ events: data.data })
      }
    }
  })
  
  // Demo simulation
  useFeedSimulation(true, addEvent)
  
  // Mark feed as read when user visits this page
  useEffect(() => { markFeedRead() }, [])
  
  const filteredEvents = useMemo(() =>
    events
      .filter(e => activeType === 'all' || e.type === activeType)
      .filter(e => activeState === 'ALL' || e.state === activeState),
    [events, activeType, activeState]
  )
  
  return (
    <div className="feed-page">
      <AppNav />
      <div className="feed-content">
        <FeedHeader
          activeType={activeType}
          activeState={activeState}
          onTypeChange={setActiveType}
          onStateChange={setActiveState}
          lastUpdated={events[0]?.event_timestamp}
        />
        <AnimatePresence mode="popLayout">
          {filteredEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </AnimatePresence>
        {filteredEvents.length === 0 && <FeedEmptyState />}
      </div>
    </div>
  )
}
```

**Empty State:**
```tsx
<div className="feed-empty">
  <p className="feed-empty-icon">🌐</p>
  <p className="feed-empty-title">No events match this filter</p>
  <p className="feed-empty-subtitle">The engine is monitoring. New events appear here as conditions change.</p>
  <button onClick={() => { setActiveType('all'); setActiveState('ALL') }}>
    Clear Filters
  </button>
</div>
```

---

## 6. Demo Flow for `/feed`

```
1. Navigate to /feed — full list of 15-20 pre-seeded Texas events loads
2. Point at the LIVE dot and timestamp: "This is what changed in our territory this week."
3. Click first card (D2 Drought escalation): "14 buildings re-ranked."
4. Click "View on Map →" — map opens, 14 buildings pulse orange
5. Come back to /feed, apply Drought filter — shows only red-border drought cards
6. Wait (or skip to) 45 seconds — new D3 drought event slides in from top, LIVE banner appears
7. "The system detected an escalation. The feed updated itself."
8. Note the nav notification dot that appeared earlier was the system telling us this was coming.
```

---

## 7. Checklist Before Moving to Phase 11

- [ ] `/feed` loads with 15–20 pre-seeded events from API
- [ ] Type filter pills work (drought, rate, incentive, sec, ordinance)
- [ ] State filter works
- [ ] Event cards have correct color left border per type
- [ ] Score delta badges show correct values and direction
- [ ] "View on Map →" navigates to /map and highlights buildings
- [ ] Live simulation injects new event at 45-second interval
- [ ] New event slides in from top with spring animation
- [ ] Live injection banner appears and auto-hides after 4 seconds
- [ ] Nav notification dot appears on new event injection
- [ ] Nav dot clears when user visits /feed
- [ ] WaterWasteMeter widget appears on every page (via layout.tsx)
- [ ] Counter starts from correct value based on time-since-midnight
- [ ] Counter ticks up smoothly every 50ms
- [ ] Olympic pools calculation updates with counter
- [ ] Minimize button collapses to pill
- [ ] Dismiss button removes widget
- [ ] "Reclaim It →" navigates to /map with top20capture filter applied
- [ ] Widget does not obscure map controls or ElevenLabs player
- [ ] Both widgets coexist (Meter bottom-right, ElevenLabs bottom-left)
