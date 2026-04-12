# PHASE 05 — Building Intelligence Detail
## Page: `/building/[id]`

**Prerequisite:** Phases 01–04 complete. `/api/building/{id}` endpoint returning full BuildingDetail object.

---

## 1. Objective

Build the deepest, most feature-rich page in the application. This page is the product's showpiece — eight distinct sections, each demonstrating a different AI or data capability. When a judge opens this page for a building, they should feel like they're reading a classified intelligence dossier.

**Eight Sections:**
1. Hero Header (score ring, archetype, quick stats)
2. Satellite Viewer (imagery, roof mask, cooling tower boxes)
3. Genome Fingerprint (animated hexagonal DNA visualization)
4. Water Twin Simulator (live scenario sliders)
5. Why-Now Event Feed (urgency catalysts)
6. AI Deal Strategist (Claude-powered brief generator)
7. Voice Pitch (Gemini-powered one-tap sales script)
8. Boardroom Clash (multi-persona AI debate)

---

## 2. Page Layout — `app/building/[id]/page.tsx`

```tsx
// Left/Right split on desktop, single column scroll on mobile
// Left panel: Sections 1, 3, 4, 5, 6 (intelligence cards stacked)
// Right panel: Sections 2 (satellite, fixed position top), then 7, 8 below
// Sticky right panel on desktop so satellite stays visible while scrolling left

export default function BuildingDetailPage({ params }: { params: { id: string } }) {
  const { data: building, isLoading } = useSWR(`/api/building/${params.id}`, fetcher)
  
  if (isLoading) return <BuildingDetailSkeleton />
  if (!building) return <NotFound />
  
  return (
    <div className="building-detail-layout">
      <AppNav />
      
      <div className="building-content">
        {/* Left column */}
        <div className="building-left">
          <HeroHeader building={building} />
          <GenomeFingerprint building={building} />
          <WaterTwin building={building} />
          <WhyNowFeed buildingId={building.id} state={building.state} />
          <DealStrategist building={building} />
        </div>
        
        {/* Right column — sticky */}
        <div className="building-right">
          <SatelliteViewer building={building} />
          <VoicePitch building={building} />
          <BoardroomClash building={building} />
        </div>
      </div>
    </div>
  )
}
```

CSS:
```css
.building-detail-layout { display: flex; height: 100vh; overflow: hidden; }
.building-content { display: grid; grid-template-columns: 1fr 480px; gap: 24px; flex: 1; overflow-y: auto; padding: 24px; }
.building-left { display: flex; flex-direction: column; gap: 20px; }
.building-right { position: sticky; top: 24px; height: fit-content; display: flex; flex-direction: column; gap: 20px; }
```

---

## 3. Section 1 — Hero Header — `components/building/HeroHeader.tsx`

```tsx
// Building name (Syne, 28px)
// Address (IBM Plex, 14px, text-secondary)
// Row: [Genome Archetype Badge] [WRAI Badge]
// Large animated score ring (120px diameter)
// Quick stats row: 3 cards
//   [📐 Roof Area] [💧 Annual Gallons] [📈 Payback Years]

// Background: subtle noise texture SVG pattern overlay on dark navy card
```

Score ring animation: `stroke-dashoffset` animated from `circumference` (no score) to `circumference * (1 - score/100)` using Framer Motion `animate` with spring physics, 1.2s duration. The number inside the ring counts up from 0 to the score value simultaneously.

Genome badge is large here (22px font), not the small pill version.

---

## 4. Section 2 — Satellite Viewer — `components/building/SatelliteViewer.tsx`

```tsx
// Container: rounded card, overflow hidden
// Image layer: <img> of building satellite chip (from building.raw_chip_url)
// SVG overlay layer: absolutely positioned, same dimensions as image
//   - Roof mask polygon: rgba(0,229,204,0.25) fill, rgba(0,229,204,0.8) stroke, 2px
//   - Cooling tower detection boxes: amber rgba(245,166,35,0.9) rect, 2px stroke
//     Each box: coordinates from building.ct_boxes [{x,y,w,h,confidence}]
//     Confidence label above each box: "84%" in Space Mono 11px amber
// Legend below image: three items with colored dot + label

// Toggle Button: "View Evidence →"
// Expanded view: three panels side by side
//   [Raw Chip | Masked Chip | Detection Chip]
//   Use different URL suffixes: /raw, /masked, /detection
//   For demo: all three can show same image with different SVG overlays

// Confidence bars below image (3 bars):
//   Roof Confidence: building.roof_confidence → 87%
//   Cooling Tower Confidence: building.ct_confidence → 84%  
//   Data Completeness: building.confidence_composite → 91%
```

Each confidence bar: a thin colored bar filling from left to right, animated on mount with a 0.8s ease-in-out.

**For hackathon demo:** Use real satellite imagery from Mapbox Static Images API:
```
https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/{lng},{lat},18,0/640x480?access_token={token}
```
Position the SVG roof mask overlay using the building's polygon coordinates projected to image space.

---

## 5. Section 3 — Genome Fingerprint — `components/building/GenomeFingerprint.tsx`

The signature visual of the product. A hexagonal honeycomb of 6 hexagons arranged radially around a center label.

### SVG Hexagon Layout
Six hexagons at 60° intervals around a center point:
- Center of overall: `(cx=200, cy=200)` in a 400×400 SVG viewBox
- Each hex center at distance 85px from center:
  - Physical: top (0°)
  - Economic: top-right (60°)
  - Regulatory: bottom-right (120°)
  - Corporate: bottom (180°)
  - Drought: bottom-left (240°)
  - Flood: top-left (300°)
- Hex size: 55px (point-to-point)

```typescript
// Hexagon polygon points generator
function hexagonPoints(cx: number, cy: number, size: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30)
    return `${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`
  }).join(' ')
}

// Six hexagons with their pillar scores
const PILLARS = [
  { name: 'Physical', key: 'physical_score', color: '#00E5CC', maxScore: 40, label: 'Physical Fit' },
  { name: 'Economic', key: 'economic_score', color: '#F5A623', maxScore: 35, label: 'Economic Viability' },
  { name: 'Regulatory', key: 'regulatory_score', color: '#4ADE80', maxScore: 10, label: 'Regulatory Tailwind' },
  { name: 'Corporate', key: 'esg_score', color: '#A78BFA', maxScore: 10, label: 'Corporate ESG' },
  { name: 'Drought', key: 'drought_score', color: '#60A5FA', maxScore: 10, label: 'Climate Urgency' },
  { name: 'Flood', key: 'fema_flood_risk', color: '#FB7185', maxScore: 10, label: 'Flood Resilience' },
]
```

### Hexagon Styling
For each hexagon:
```tsx
<polygon
  points={hexagonPoints(cx, cy, 55)}
  fill={`${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`}
  stroke={color}
  strokeWidth="2"
  style={{ animationDelay: `${index * 200}ms` }}
  className="genome-hex"
/>
```

where `opacity = normalizedScore / 100` (score normalized to 0–1 range relative to its max).

### Breathing Animation
```css
@keyframes hexBreath {
  0%, 100% { transform: scale(1.0); filter: brightness(1); }
  50% { transform: scale(1.04); filter: brightness(1.2); }
}

.genome-hex {
  transform-origin: center;
  animation: hexBreath var(--breath-duration) ease-in-out infinite;
}

/* Each hex gets a different duration (1.8s to 2.6s) via inline style */
/* hex 0: 2.1s, hex 1: 1.9s, hex 2: 2.4s, hex 3: 2.0s, hex 4: 2.6s, hex 5: 1.8s */
/* This ensures they're NEVER synchronized */
```

### Center Label
```tsx
<text x={200} y={195} textAnchor="middle" className="genome-archetype-label" fontSize={16} fontFamily="var(--font-syne)">
  {building.genome_archetype.split(' ').map((word, i) => (
    <tspan x={200} dy={i === 0 ? 0 : 20} key={i}>{word}</tspan>
  ))}
</text>
```

### Pillar Labels
Each hexagon has a label outside it (pillar name + score/max):
```tsx
<text x={labelX} y={labelY} fontSize={10} fontFamily="var(--font-mono)" fill={color}>
  {pillar.label}
</text>
<text x={labelX} y={labelY + 13} fontSize={12} fontFamily="var(--font-mono)" fill="white">
  {score.toFixed(1)}/{pillar.maxScore}
</text>
```

### Tooltip on Hover
Radix UI `Tooltip.Root` on each hexagon. Content: pillar name + score + one-line driver explanation:
- Physical: "Roof area of 142,000 sqft exceeds 100k threshold. Two cooling towers at 84% confidence."
- Economic: "Combined water+sewer rate at $9.60/kgal. $5,000 TX rebate available."
- etc.

---

## 6. Section 4 — Water Twin Simulator — `components/building/WaterTwin.tsx`

### Layout
Left side: animated SVG water flow diagram
Right side: controls + live output numbers

### SVG Water Flow Diagram
A simple animated diagram showing water flowing through the system:
```
☁️ Cloud → 🏢 Roof → 💧 Cistern → ⚙️ Pump → 🏭 Building Uses
```

Use SVG `<path>` elements with `stroke-dashoffset` animation to show animated flow (water "moving" along the path). Teal droplets (small circles) moving along the paths using `animateMotion`.

### Controls
```tsx
// Scenario preset pills
<div className="scenario-presets">
  {['Normal Year', 'D3 Drought', 'Rate Shock', 'Flood Year', 'Custom'].map(scenario => (
    <button
      key={scenario}
      className={activeScenario === scenario ? 'preset-active' : 'preset'}
      onClick={() => applyPreset(scenario)}
    >
      {scenario}
    </button>
  ))}
</div>

// Custom sliders (shown when 'Custom' selected)
<Slider label="Annual Rainfall Adjustment" min={-40} max={20} step={1} unit="%" />
<Slider label="Water Rate Multiplier" min={1.0} max={2.0} step={0.05} unit="×" />
<Slider label="Reuse Fraction" min={50} max={95} step={1} unit="%" />
<Slider label="Runoff Coefficient" min={0.75} max={0.95} step={0.01} unit="" />
```

Preset values:
```typescript
const PRESETS = {
  'Normal Year': { rainfallAdj: 0, rateMultiplier: 1.0, reuseFraction: 0.85, runoff: 0.85 },
  'D3 Drought': { rainfallAdj: -0.35, rateMultiplier: 1.0, reuseFraction: 0.85, runoff: 0.85 },
  'Rate Shock': { rainfallAdj: 0, rateMultiplier: 1.5, reuseFraction: 0.85, runoff: 0.85 },
  'Flood Year': { rainfallAdj: 0.20, rateMultiplier: 1.0, reuseFraction: 0.90, runoff: 0.88 },
}
```

### Live Output Numbers
```tsx
// Computed client-side using TypeScript hydrology module
// Updated with useDebounce(100ms) on slider changes

<OutputStat label="Annual Capture" value={`${(annual_gallons/1e6).toFixed(2)}M gal`} highlight />
<OutputStat label="Annual Savings" value={`$${annual_savings.toLocaleString()}`} />
<OutputStat label="Payback Period" value={`${payback_years.toFixed(1)} years`} />
<OutputStat label="IRR" value={`${irr_pct.toFixed(1)}%`} />
<OutputStat label="Stormwater Avoidance" value={`$${stormwater_avoidance.toLocaleString()}/yr`} />
<OutputStat label="20-Year NPV" value={`$${(npv_20yr/1000).toFixed(0)}k`} />
```

Numbers animate (count up from previous value) when scenario changes, using Framer Motion `useSpring`.

### Recharts Savings Curve
```tsx
<AreaChart data={savings_curve} width={400} height={150}>
  <defs>
    <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#00E5CC" stopOpacity={0.4} />
      <stop offset="95%" stopColor="#00E5CC" stopOpacity={0} />
    </linearGradient>
  </defs>
  <Area type="monotone" dataKey="cumulative_savings" stroke="#00E5CC" fill="url(#savingsGrad)" />
  {/* Vertical dashed line at payback crossover (where savings crosses 0) */}
  <ReferenceLine x={payback_year_index} stroke="#F5A623" strokeDasharray="4 4" label="Payback" />
  <XAxis dataKey="year" />
  <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
</AreaChart>
```

---

## 7. Section 5 — Why-Now Event Feed — `components/building/WhyNowFeed.tsx`

A vertical stack of up to 5 event cards, filtered to this building's `building_ids` and jurisdiction from the `alert_events` table.

```tsx
// Data: building.alert_events (pre-joined from API)
// Sorted by score_delta DESC

{events.slice(0, 5).map(event => (
  <div key={event.id} className={`why-now-card type-${event.type}`}>
    <span className="event-type-icon">{TYPE_ICONS[event.type]}</span>
    <div className="event-body">
      <p className="event-description">{event.description}</p>
      <span className="event-timestamp">{formatRelative(event.event_timestamp)}</span>
    </div>
    <div className="score-impact-badge">
      +{event.score_delta.toFixed(1)} pts
    </div>
  </div>
))}
```

Left border color by type:
```css
.type-drought { border-left: 3px solid #FB7185; }
.type-rate { border-left: 3px solid #F5A623; }
.type-incentive { border-left: 3px solid #4ADE80; }
.type-sec { border-left: 3px solid #A78BFA; }
.type-ordinance { border-left: 3px solid #60A5FA; }
```

---

## 8. Section 6 — AI Deal Strategist — `components/building/DealStrategist.tsx`

```tsx
// Three mode tabs: Sales / Engineering / Executive
// Below: streaming output textarea
// Copy + Download + Regenerate buttons

const [mode, setMode] = useState<'Sales' | 'Engineering' | 'Executive'>('Sales')
const [output, setOutput] = useState('')
const [isGenerating, setIsGenerating] = useState(false)

async function generateMemo() {
  setIsGenerating(true)
  setOutput('')
  
  const response = await fetch(`/api/building/${building.id}/memo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode })
  })
  
  // Stream response token by token via SSE or chunked transfer
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  
  while (true) {
    const { done, value } = await reader!.read()
    if (done) break
    const chunk = decoder.decode(value)
    setOutput(prev => prev + chunk)
  }
  
  setIsGenerating(false)
}
```

Output area styling:
```css
.deal-memo-output {
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text-primary);
  background: var(--color-bg-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  min-height: 200px;
  position: relative;
}

/* Grundfos watermark in corner */
.deal-memo-output::after {
  content: 'Grundfos';
  position: absolute;
  bottom: 12px;
  right: 16px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-text-secondary);
  opacity: 0.4;
}
```

The Claude prompt for each mode is defined in Phase 06.

---

## 9. Section 7 — Voice Pitch — `components/building/VoicePitch.tsx`

```tsx
const [state, setState] = useState<'idle' | 'generating' | 'speaking' | 'done'>('idle')
const [script, setScript] = useState('')

async function generateAndSpeak() {
  setState('generating')
  
  // Call Gemini for the pitch script
  const res = await fetch(`/api/building/${building.id}/voice-script`, { method: 'POST' })
  const { script: pitchScript } = await res.json()
  setScript(pitchScript)
  
  setState('speaking')
  
  // Speak using browser's speech synthesis
  const utterance = new SpeechSynthesisUtterance(pitchScript)
  utterance.rate = 0.95
  utterance.pitch = 1.0
  utterance.volume = 1.0
  // Try to use a good voice
  const voices = speechSynthesis.getVoices()
  const preferred = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google UK English Female'))
  if (preferred) utterance.voice = preferred
  
  utterance.onend = () => setState('done')
  speechSynthesis.speak(utterance)
}
```

UI:
```tsx
{/* Large circular button */}
<motion.button
  className="voice-pitch-btn"
  animate={state === 'idle' ? { boxShadow: ['0 0 0px rgba(0,229,204,0)', '0 0 20px rgba(0,229,204,0.6)', '0 0 0px rgba(0,229,204,0)'] } : {}}
  transition={{ duration: 2, repeat: Infinity }}
  onClick={generateAndSpeak}
  disabled={state === 'generating' || state === 'speaking'}
>
  {state === 'idle' && <MicrophoneIcon size={32} />}
  {state === 'generating' && <Spinner />}
  {state === 'speaking' && <WaveformAnimation />}
  {state === 'done' && <CheckIcon />}
</motion.button>

<p className="voice-btn-label">
  {state === 'idle' && 'Generate Voice Pitch'}
  {state === 'generating' && 'Generating script...'}
  {state === 'speaking' && 'Playing...'}
  {state === 'done' && 'Pitch Complete'}
</p>

{/* Waveform animation while speaking */}
{state === 'speaking' && <WaveformDisplay />}

{/* Scrolling transcript */}
{script && (
  <div className="pitch-transcript mono">
    {script}
  </div>
)}
```

Waveform animation: 5 SVG bars, each with `@keyframes` random height animation, 150–400ms cycle:
```css
@keyframes wave1 { 0%,100%{height:8px} 50%{height:24px} }
@keyframes wave2 { 0%,100%{height:16px} 50%{height:6px} }
/* etc. */
```

---

## 10. Section 8 — Boardroom Clash — `components/building/BoardroomClash.tsx`

```tsx
interface DialogueTurn {
  persona: 'CFO' | 'Facilities_VP' | 'ESG_Officer' | 'Risk_Manager' | 'Moderator'
  text?: string
  verdict?: string
  confidence?: number
}

const PERSONA_CONFIG = {
  CFO: { icon: '💼', color: '#F5A623', label: 'CFO' },
  Facilities_VP: { icon: '🔧', color: '#60A5FA', label: 'Facilities VP' },
  ESG_Officer: { icon: '🌱', color: '#4ADE80', label: 'ESG Officer' },
  Risk_Manager: { icon: '⚠️', color: '#FB7185', label: 'Risk Manager' },
  Moderator: { icon: '⚖️', color: '#A78BFA', label: 'Moderator' },
}

const [dialogue, setDialogue] = useState<DialogueTurn[]>([])
const [isRunning, setIsRunning] = useState(false)
const [displayedCount, setDisplayedCount] = useState(0)

async function startBoardroom() {
  setIsRunning(true)
  setDialogue([])
  setDisplayedCount(0)
  
  const res = await fetch(`/api/building/${building.id}/boardroom`, { method: 'POST' })
  const { dialogue: turns } = await res.json()
  setDialogue(turns)
  
  // Stream messages with delays
  for (let i = 0; i < turns.length; i++) {
    await new Promise(r => setTimeout(r, 700))
    setDisplayedCount(i + 1)
  }
  
  setIsRunning(false)
}
```

UI:
```tsx
{/* Four persona avatars at top */}
<div className="boardroom-avatars">
  {Object.entries(PERSONA_CONFIG).filter(([k]) => k !== 'Moderator').map(([key, config]) => (
    <div key={key} className="persona-avatar" style={{ borderColor: config.color }}>
      <span className="persona-icon">{config.icon}</span>
      <span className="persona-label">{config.label}</span>
    </div>
  ))}
</div>

{/* Start button */}
{dialogue.length === 0 && (
  <button className="boardroom-start-btn" onClick={startBoardroom} disabled={isRunning}>
    {isRunning ? 'Loading...' : '▶ Start Boardroom'}
  </button>
)}

{/* Dialogue messages — revealed sequentially */}
<div className="boardroom-dialogue">
  {dialogue.slice(0, displayedCount).map((turn, i) => (
    <motion.div
      key={i}
      className={`dialogue-turn ${turn.persona === 'Moderator' ? 'moderator-turn' : 'persona-turn'}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <span className="turn-icon">{PERSONA_CONFIG[turn.persona].icon}</span>
      <div className="turn-content">
        <span className="turn-label" style={{ color: PERSONA_CONFIG[turn.persona].color }}>
          {PERSONA_CONFIG[turn.persona].label}
        </span>
        <p className="turn-text">{turn.text || turn.verdict}</p>
      </div>
    </motion.div>
  ))}
  
  {/* Typing indicator between messages */}
  {isRunning && displayedCount < dialogue.length && (
    <div className="typing-indicator">
      <span /><span /><span />
    </div>
  )}
</div>

{/* Moderator verdict — distinct card */}
{dialogue[dialogue.length - 1]?.verdict && displayedCount === dialogue.length && (
  <motion.div
    className="moderator-verdict"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
  >
    <div className="verdict-header">
      <span>⚖️ Moderator Verdict</span>
      <span className="confidence-ring">
        {dialogue[dialogue.length - 1].confidence}% Confidence
      </span>
    </div>
    <p>{dialogue[dialogue.length - 1].verdict}</p>
  </motion.div>
)}
```

---

## 11. Building Detail Skeleton

While `isLoading`, render a skeleton screen that matches the layout:
```tsx
// All cards rendered as shimmer placeholders
// Shimmer effect: CSS animation sweeping gradient from transparent to white/5% to transparent
// Same layout proportions as real content — prevents layout shift on load
```

---

## 12. Checklist Before Moving to Phase 06

- [ ] All 8 sections render with correct data from API
- [ ] Satellite image loads with SVG roof mask overlay
- [ ] Cooling tower boxes drawn at correct relative positions
- [ ] Genome hexagons pulse organically (all on different cycles)
- [ ] Hexagon tooltips show correct pillar data
- [ ] Water Twin computes correct gallons for primary buildings (verify against Phase 02 formula)
- [ ] Preset scenarios change output numbers instantly
- [ ] Savings curve chart updates when scenario changes
- [ ] Payback crossover line moves when scenario changes
- [ ] Why-Now events display with correct color borders
- [ ] Deal Strategist tabs work (Sales/Engineering/Executive)
- [ ] Streaming output works (even if mock for now)
- [ ] Voice Pitch button launches speech synthesis
- [ ] Waveform animation plays during speech
- [ ] Boardroom messages appear sequentially with 700ms delays
- [ ] Typing indicator shows between messages
- [ ] Moderator verdict appears with confidence ring
- [ ] Score ring in hero animates on page load
