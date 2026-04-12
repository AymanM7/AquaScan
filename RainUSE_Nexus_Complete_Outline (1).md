# RainUSE Nexus — Complete Application Outline
### Autonomous Water-Opportunity Intelligence Engine for Grundfos
**Hackathon Build Document · April 2026**

---

## The Problem

Commercial and industrial buildings across the continental United States sit atop an invisible, untapped resource: billions of gallons of harvestable rainwater and stormwater that flow off large roofs and into overburdened municipal systems every year. Meanwhile, water utility costs are rising 5–10% annually, stormwater penalties are tightening, droughts are intensifying across the Sun Belt, and corporate ESG mandates are creating procurement pressure to act. Grundfos has the hardware solution — the RainUSE Nexus system — but finding the *right building, in the right city, at the right regulatory and financial moment* currently requires manual prospecting across siloed data sources: satellite imagery, municipal rate databases, stormwater ordinances, FEMA flood maps, US Drought Monitor, and SEC corporate filings. There is no single platform that synthesizes all of these signals into an actionable ranked list of high-probability targets. The result is reactive, slow, geography-limited prospecting at exactly the moment the market is accelerating.

---

## The Proposed Solution

RainUSE Nexus is a web-based autonomous prospecting intelligence engine that transforms every large commercial and industrial rooftop in the continental US into a scoreable, rankable "water asset." The platform fuses four data universes — satellite computer vision for physical detection, financial and regulatory databases for economic modeling, US climate and environmental layers for resilience scoring, and SEC EDGAR corporate disclosures for ESG signal extraction — into a single, explainable **Viability Score** per building. Grundfos sales teams complete a one-time onboarding setup that configures their territory, score threshold, and automation cadence, then enter a full-screen map-based command center showing the highest-probability targets in their region. They can drill into any building to see its satellite-confirmed roof catchment area, cooling tower detection confidence, estimated annual water capture in gallons, IRR and payback period, active regulatory tailwinds, and a one-click AI-generated sales memo. Beyond the interactive experience, the platform operates autonomously on a user-defined schedule — daily, weekly, or bi-weekly — scanning the territory, detecting buildings that cross the user's chosen score threshold, and automatically dispatching a deep-research report powered by the Perplexity Sonar API: ownership details, business purpose, licensing status, and verified contact information for the decision-maker. Reports are routed directly to the nearest assigned sales rep with a suggested outreach pipeline. Every time a rep signs in, ElevenLabs delivers a voice-generated intelligence debrief covering the current landscape, top new prospects, and key market shifts — turning a login into a briefing. The system continuously updates as drought conditions worsen, ordinances change, and corporate risk disclosures shift, making RainUSE Nexus not just a finder but a self-operating sales intelligence machine that tells Grundfos not just where opportunity exists, but *where it is becoming strategically inevitable right now.*

---

## Product Pages

### 0. Welcome & Onboarding Setup (`/onboarding`)
A one-time setup flow for new users completing three configuration steps: territory selection (DFW for now, with expansion slots visible but locked), automation interval (Daily / Weekly / Bi-Weekly), and score threshold (a draggable slider from 0–100 that sets the minimum composite score that triggers automated deep-research reports). Once configured, settings persist to the user's Auth0 profile and the automation engine activates. Returning users skip directly to the map.

### 1. Landing / Mission Control Entry (`/`)
The cinematic entry point. Animated rain falls over a dark satellite view of the US. A bold headline. A state selector. One call to action: *"Find Water Opportunities."* Sets the tone for everything that follows. New users are redirected to `/onboarding` before reaching this screen. Returning users hear the ElevenLabs intelligence debrief begin playing softly in the background as the page loads — a personalized voice briefing covering today's top prospects, recent score changes, and active automation results.

### 2. Map Intelligence Dashboard (`/map`)
The primary working interface. Full-screen dark map with glowing building polygons colored by Viability Score, live rain particle animation, opportunity cluster heatmap, filter sidebar, and a scrolling alert ticker at the top. The engine's command center.

### 3. Building Intelligence Detail (`/building/[id]`)
Deep-dive panel for a single building. Satellite imagery with AI-generated roof mask and cooling tower detection boxes, Genome Fingerprint hexagon visualization, Water Twin simulator with live scenario sliders, Why-Now event feed, AI Deal Strategist brief generator, and Boardroom Clash simulation.

### 4. State Battle Arena (`/compare`)
Split-screen head-to-head market comparison between any two states. Animated radar charts, aggregate stats, top-5 building lists per state, and an AI-generated market verdict with strategic recommendation.

### 5. Portfolio Domino View (`/portfolio/[owner]`)
Enterprise account strategy view. Shows all buildings under the same corporate owner or REIT across the US, ranked by Viability Score, with total enterprise opportunity calculation and a "first domino" anchor site recommendation.

### 6. Secure Dealroom (`/dealroom/[id]`)
Auth0-gated, role-based dossier view for a single prospect. Contains the full evidence package: image audit, water twin output, ROI scenarios, generated memo, boardroom brief. Designed for sharing with a customer or a sales manager. Human-in-the-loop AI approval gate lives here.

### 7. Opportunity Shock Feed (`/feed`)
A real-time (or simulated real-time) alert stream of market events: drought escalations, new ordinances, rate changes, SEC filings, and LEED certifications that have caused buildings' scores to shift. Each event is clickable and routes back to the affected buildings on the map.

### 8. Automation Intelligence Center (`/automation`)
The control panel for the autonomous prospecting engine. Displays the current automation configuration (territory, interval, threshold), a live status indicator showing when the next scan runs, a history log of all past automation runs with timestamps and result counts, and a full feed of every AI-generated deep-research report produced by the Perplexity Sonar engine since the user activated the system. Each report card in the feed shows the building that triggered it, the score that crossed the threshold, and a preview of the ownership and contact data discovered.

### 9. Intelligence Report Detail (`/report/[id]`)
The full output of a single Perplexity Sonar deep-research run on one building. Structured as a classified-style dossier: building ownership chain, business purpose and industry classification, licensing and permit status pulled from public records, verified decision-maker contact information, a suggested outreach pipeline with three touchpoint scripts (cold email, LinkedIn message, phone opener), and the AI-generated score rationale explaining why this building crossed the threshold. Includes the full automation context: when the scan ran, what the score was at trigger time, and which rep the report was routed to.

### 10. Rep Notification Inbox (`/inbox`)
A role-gated page (visible to `grundfos_rep` and `grundfos_manager` only via Auth0 FGA). Shows all reports that have been routed to the logged-in rep based on their territory assignment. Each notification card shows: building name, address, score at trigger time, genome archetype, top contact name and title, and a *"View Full Report"* button. Unread reports have a glowing teal left border. A summary stat at the top: *"3 new prospects crossed your threshold this week."*

---

## Core Features

**Physical Intelligence (CV Engine)**
Satellite and aerial imagery from NAIP (60cm resolution) and Sentinel-2 is processed using SAM 2 semantic segmentation and Grounding DINO zero-shot detection to extract precise roof catchment polygons and identify cooling tower presence. Each detection outputs a composite Confidence Score built from model certainty, imagery quality, shadow/cloud obstruction, footprint alignment, and multi-pass agreement. Buildings with roof area exceeding 100,000 sq ft are automatically flagged and elevated in the prospect hierarchy.

**Explainable Viability Score (0–100)**
A six-pillar AHP-weighted composite score: Physical Fit (40%), Economic Viability (35%), Strategic/ESG Readiness (25%). Physical covers roof area, cooling tower probability, and CV confidence. Economic covers local water and sewer rates, stormwater fees (ERU-based), rebates, and tax exemptions. Strategic covers SEC ESG disclosure intensity, LEED signals, drought severity, and flood exposure. Every score decomposes fully in the UI so judges and users can audit every point. The final score is confidence-adjusted: `V_adj = V × (0.6 + 0.4 × confidence)`.

**Rain-to-Resilience Water Twin Simulator**
Per-building hydrological simulation using the formula: `Annual Gallons = Roof Area (sqft) × Annual Rain (in) × 0.623 × Runoff Coefficient × Pitch Multiplier`. Outputs annual harvestable gallons, IRR, payback period in years, stormwater fee avoidance, utility savings, and incentives captured. Scenario sliders let users stress-test D3 drought (−35% rainfall), rate shock (+50% utility rates), and high-reuse assumptions live in the browser with animated updates.

**Municipal Incentive Adapter Engine**
A modular, city-level rules engine pre-loaded with tier-1 adapters for Austin TX (GoPurple program, $5k rebate, reuse mandate for >100k sqft buildings), Dallas/Fort Worth TX (commercial rebate program, Texas sales tax exemption under §151.355, property tax exemption under §11.32), Philadelphia PA (up to $100k/acre green infrastructure grants, stormwater credits up to 45%), and Tucson AZ ($2,000 harvesting rebate). A generic adapter template allows any city to be added by filling a JSON schema.

**Corporate ESG Intelligence via SEC EDGAR**
Automated scraping of 10-K annual reports using `sec-edgar-downloader` and `edgartools`. NLP keyword extraction from Item 1A (Risk Factors) and Item 7 (MD&A) targeting water scarcity, drought, flood business interruption, water quality, Legionella, net-zero water, LEED, and water stewardship language. Owner-to-company mapping via Regrid parcel API → SEC CIK mapper links a building address to its parent corporation's filing history. Companies with >5 water-risk mentions in recent filings are flagged as "Corporate ESG Accelerator" prospects.

**Why-Now Event Engine**
Event-driven urgency layer that detects and surfaces timing catalysts per building: US Drought Monitor severity escalation, new municipal ordinances or rebate programs, SEC water-risk disclosure in recent filings, local utility rate increases, and FEMA flood zone reclassifications. Each catalyst is tagged with its score impact (e.g., "+6 pts from drought escalation"). Buildings are ranked by urgency as well as static fit.

**AI Deal Strategist (Claude API)**
One-click generation of a prospect brief in three modes — Sales (urgency and ROI), Engineering (system specs and integration path), Executive (strategic resilience and ESG narrative) — grounded in the building's actual satellite evidence, water economics, and parent company's own SEC language. Output is a 300-word brief that a Grundfos rep can paste directly into an outreach sequence.

**Portfolio Domino Effect**
Parcel owner or parent company clustering that identifies all buildings under the same corporate umbrella across the US. Surfaces the "anchor site" — the single highest-score building that, if won, could unlock an enterprise rollout across an entire REIT or manufacturing portfolio. Displays total enterprise opportunity: combined roof area, annual capture, and savings potential.

**Autonomous Prospecting Engine (Scheduled Automation)**
A backend cron system configurable per user as Daily, Weekly, or Bi-Weekly. On each run, the engine re-scores all buildings in the user's territory, identifies any building whose composite Viability Score has crossed the user's configured threshold (e.g., 70, 80, or 90), and for each newly-qualifying building, automatically triggers a Perplexity Sonar deep-research job. The automation logs every run — timestamp, buildings scanned, new threshold crossings, reports dispatched — in the Automation Intelligence Center. The engine is designed to catch the moment a building crosses the line, not just periodically resurface buildings that were already high-scoring.

**Perplexity Sonar Deep-Research Reports**
For every building that crosses the automation threshold, a Perplexity Sonar API call performs a live web search and synthesizes public data on that building into a structured intelligence report covering: property ownership chain (corporate parent, LLC, REIT), building purpose and primary industry, active business licenses and permits, verified contact information for the facilities director or property manager (name, title, email, LinkedIn where available), local news or press coverage relevant to water, sustainability, or expansion, and any known ESG commitments or public sustainability pledges. The report is generated in under 60 seconds and stored in the database linked to the triggering automation run.

**Automated Rep Routing and Notifications**
Once a Perplexity Sonar report is complete, the system identifies the nearest assigned Grundfos sales rep based on the building's ZIP code and the rep's territory mapping stored in Auth0 user metadata. The rep receives a notification in their `/inbox` feed and optionally an email or Slack message (configurable in onboarding settings). Each notification includes the report preview, the score that triggered it, and three ready-to-use outreach scripts (cold email, LinkedIn opener, phone script) generated by Claude based on the building's specific ownership profile and water-risk context.

**ElevenLabs Login Intelligence Debrief**
Every time a user authenticates and the landing page loads, the system assembles a 45-to-60-second personalized audio briefing and plays it through ElevenLabs' text-to-speech API. The debrief script is generated fresh on each login by Claude, drawing from: the user's current territory scan results, the top 3 buildings by Viability Score change since last login, any automation reports that ran since the user was last active, active drought or regulatory alerts in their territory, and the current WRAI landscape (which building types are showing the highest strategic urgency this week). The voice plays softly in the background with a floating audio player widget in the bottom-left corner showing the transcript line by line as it plays. The user can pause, replay, or dismiss at any time.

---

## Novelty Features (The Standout Moments)

**🌧️ Rain Pulse — The Living Map**
Real-time animated rain particles fall across the map canvas using a WebGL/Canvas overlay. When particles land on high-score buildings, those buildings pulse with a ripple glow effect — visually encoding that these specific rooftops are the ones worth catching the rain. Low-score buildings stay dark and silent. The map literally rains, and the opportunity glows. Implemented as a `requestAnimationFrame` canvas overlay with polygon collision detection against deck.gl building bounds. No backend required — pure frontend.

**🧬 Genome Fingerprint — The Building's Water DNA**
Each building's score breakdown is visualized not as a bar chart but as an animated hexagonal honeycomb — six glowing hexagons arranged radially, each pulsing with color intensity proportional to its sub-score. Physical Fit glows electric teal. Economic Viability pulses amber-gold. ESG Readiness shimmers green. Flood Resilience pulses blue. In the center of the honeycomb: the building's archetype label in large type (*Storm-Value Titan*, *Cooling-Driven Reuse Giant*, *ESG Mandate Accelerator*, *Hidden High-ROI Candidate*, *Flood-Resilience Priority*). When two buildings are compared, two Genomes animate side by side and hexagons that differ by more than 20 points spark. Implemented in SVG with staggered CSS `@keyframes` pulse animations.

**🎙️ Water Pitch Voice — One-Tap AI Sales Brief**
A large glowing button in the building detail panel: *"Generate Voice Pitch."* The judge taps it. Gemini generates a 25-second custom sales script grounded in that building's actual data — roof size, gallons, payback, drought status, incentives, parent company's water-risk language from their 10-K. The script is then spoken aloud using the browser's `window.speechSynthesis` API (or ElevenLabs for a premium voice). The building literally pitches itself. The UI shows a live waveform animation while the voice plays. No judge at the hackathon will have heard a building pitch itself before.

**🤖 Boardroom Clash — Live AI Stakeholder Debate**
A chat-style interface with four avatar personas: CFO 💼 (skeptical of payback timeline), Facilities VP 🔧 (focused on installation disruption), ESG Officer 🌱 (eager, citing the 10-K risk language), Risk Manager ⚠️ (flagging drought exposure). The judge hits *"Start Boardroom."* In real-time, the four personas debate whether to purchase the Grundfos system for that exact building, using the building's actual data in every argument. A Moderator AI then delivers a verdict with confidence score and recommended next step. Implemented as one Claude/Gemini API call returning structured JSON dialogue, streamed into a chat UI with 600ms inter-message delays and animated typing indicators.

**💧 Live Water Waste Meter — The Scrolling Counter**
A persistent floating widget in the corner of the screen counting up in real-time: *"💧 Water Being Wasted Right Now in Unoptimized TX Buildings: 8,247,193,041 gallons."* Below it: *"= 12,495 Olympic swimming pools this year."* A *"Reclaim It →"* button re-filters the map to the top 20 capture opportunities. The counter ticks up every 50ms based on the mathematically correct annual waste divided by seconds per year. Fully computed, psychologically devastating, immediately understood.

**📡 Opportunity Shock Ticker — The Alert Feed**
A sleek horizontal news ticker scrolling above the map: *"🔴 Dallas County elevated to D2 drought — 14 buildings re-ranked ↑ · 🟡 Austin water rate +7.2% — ROI recalculated for 8 sites · 🟢 Texas stormwater credit approved — 3 new qualifiers ·"* Each item is clickable: the map zooms to the affected buildings, highlights them with an orange pulse, and the score panel shows what changed and by how much. Hardcoded in a JSON event array for hackathon, designed to look entirely live. Creates urgency and signals a real-time intelligence product.

**⚔️ State Battle Arena — Head-to-Head Market Comparison**
A split-screen mode where the user selects two states. Animated score cards fly in from opposite sides of the screen. Radar charts for each state overlay against each other. A winner banner drops for each category (Volume, ROI, Regulatory Tailwind, Corporate Readiness). An AI-generated one-paragraph market verdict names which state to prioritize in Q1 and why. Judges see this as a *strategy tool for sales leadership*, not just a building finder — dramatically expanding the perceived business value.

**🔐 Secure Dealroom with Auth0 AI Agent Approval Gate**
Two login modes: *Grundfos Rep* and *Judge Preview*. Reps see confidentiality locks on buildings already in the pipeline. When a Rep generates a memo and clicks *"Send to Prospect,"* an Auth0 AI Agent surfaces an approval modal: *"Your AI agent is about to send this brief to [Company Name]. Review and approve?"* The AI visibly waits. This is human-in-the-loop AI governance, demonstrated live, in 10 seconds, in a way that every enterprise judge will immediately recognize as production-grade.

**🌊 Water Resilience Alpha Index (WRAI)**
A proprietary second metric displayed as a badge on every building card alongside the Viability Score. WRAI measures *strategic first-mover advantage* — how much competitive resilience edge a company gains by adopting reuse *before* their industry peers, regulatory mandates, or climate conditions force the move. Computed from regulatory momentum (30%), climate acceleration (25%), peer ESG pressure (25%), and utility rate trajectory (20%). Buildings with WRAI > 80 are badged *"Act Now"* in red. This is the metric that makes the product feel like it has proprietary IP, not just a weighted average.

**🎛️ Onboarding Setup Flow — Personalized Intelligence Configuration**
First-time users are guided through a three-step cinematic onboarding screen before they ever see the map. Step 1 is territory selection — a glowing map of the US with DFW highlighted in teal (other cities visible as dimmed future expansion slots, labeled *"Coming Soon"*). Step 2 is automation cadence — three large pill cards: *Daily*, *Weekly*, *Bi-Weekly*, each with an icon and a one-line description of what that frequency is best for. Step 3 is the score threshold — a large interactive slider from 0 to 100 with a live preview below it showing approximately how many buildings in the DFW territory currently exceed that threshold (*"At 75: ~47 buildings qualify. At 85: ~12 buildings qualify."*). A final confirmation screen shows a summary of the chosen settings and a *"Activate Intelligence Engine"* button that triggers a satisfying particle burst animation before routing to the map. Settings are saved to Auth0 user metadata and the cron scheduler is initialized server-side.

**🤖 Autonomous Threshold Scanner — The Engine That Never Sleeps**
The most powerful novelty feature for enterprise judges: the system genuinely operates without any human action. The Celery/cron job runs on the configured interval, re-scores all DFW buildings, detects threshold crossings, fires Perplexity Sonar research jobs, and dispatches reports to the right rep — all while the rep is away. When the rep returns and logs in, new reports are waiting in their inbox. The automation run log in `/automation` shows a timestamped history with a visual timeline of when each scan ran, how many buildings were evaluated, and how many crossed the threshold. During a demo, show a "Simulate Automation Run" button that fires the full pipeline in accelerated time (30-second demo mode) so judges can watch the entire loop execute live.

**🔍 Perplexity Sonar Deep-Research Dossier**
When the automation engine flags a building, Perplexity Sonar performs a live web search synthesis that no static database can match — it searches the open web in real time and returns structured intelligence on that specific building: who owns it (traced through LLCs to the corporate parent if needed), what the business does, any recent news about expansion or sustainability commitments, verified contact information for the facilities decision-maker, and active business licenses. This data is assembled into a visual dossier card in the UI with color-coded confidence levels on each data point (High Confidence = verified public record, Medium = inferred from multiple sources, Low = single source, unverified). The dossier also includes three Claude-generated outreach scripts personalized to that building's ownership profile and water situation.

**🎙️ ElevenLabs Login Intelligence Debrief — The Voice That Greets You**
Every login triggers a fresh, personalized audio briefing voiced by ElevenLabs. The experience: after Auth0 authentication resolves and the landing page begins to render, a floating audio player widget appears in the lower-left corner with a soft fade-in and a waveform animation. A warm, professional voice begins: *"Good morning. Since your last session, two buildings in the DFW territory crossed your threshold of 80. The top new prospect is a 160,000 square-foot logistics facility near Plano with an estimated 2.8 million gallons of annual capture potential and an active D2 drought condition. Your automation report is ready in the inbox. The DFW water market outlook has strengthened — three new stormwater ordinances passed last month..."* The script is generated by Claude using live data from the user's territory scan and delivered via ElevenLabs' streaming API. The transcript scrolls line by line in the widget as the voice plays. This is the only hackathon product in the room that greets its users by voice with personalized intelligence.

---

## Frontend Overview

### Aesthetic Direction: *"Dark Hydro-Intelligence"*
The visual language is deep ocean meets aerospace command center. Not a generic SaaS dashboard — a *mission control for water strategy*. The base is near-black navy (`#060D1A`), with electric teal (`#00E5CC`) as the primary action color, deep amber (`#F5A623`) for economic signals, and soft ice-white (`#E8F4F8`) for data text. The map dominates every screen — the interface wraps around it, not the other way.

Typography uses **Space Mono** for numeric data and scores (monospaced numbers feel like real-time sensor readings), paired with **Syne** for headings (geometric, architectural, memorable) and **IBM Plex Sans** for body and labels (technical legibility). This combination reads as intelligence infrastructure, not a startup landing page.

Motion is purposeful: all panel entrances use spring physics (not ease-in-out), score bars animate sequentially with staggered reveals, map building polygons bloom in cascading by score on state load, and the Genome Fingerprint hexagons pulse on an organic 2.4-second breathing cycle.

### Core Frontend Packages

| Package | Purpose |
|---|---|
| `next` 14 (App Router) | Framework, routing, SSR |
| `mapbox-gl` | Primary map renderer |
| `@deck.gl/react` | Building polygon layers, heatmap, scatter |
| `@deck.gl/aggregation-layers` | Opportunity cluster heatmap |
| `framer-motion` | Panel springs, card reveals, page transitions |
| `@radix-ui/react-*` | Accessible primitives: dialogs, tooltips, selects |
| `tailwindcss` | Utility styling |
| `recharts` | ROI payback curve, score history sparklines |
| `@auth0/auth0-react` | Auth0 React SDK |
| `react-use` | `useInterval`, `useDebounce`, `useMeasure` |
| `zustand` | Global app state (selected building, active state, filters) |
| `swr` | Data fetching with revalidation |
| `canvas-confetti` | Victory moment when a top building is selected (subtle) |
| `react-spring` | Genome hexagon spring animations |
| `@phosphor-icons/react` | Icon system (water, building, climate icons) |
| `clsx` + `tailwind-merge` | Conditional class utilities |
| `date-fns` | Alert ticker timestamp formatting |
| `@tanstack/react-table` | Building ranked list table with sorting/filtering |

### Component Architecture

```
/app
  layout.tsx                  → Root layout: Auth0 provider, Zustand store, fonts
  page.tsx                    → Landing / Mission Control Entry
  /map/page.tsx               → Map Intelligence Dashboard
  /building/[id]/page.tsx     → Building Intelligence Detail
  /compare/page.tsx           → State Battle Arena
  /portfolio/[owner]/page.tsx → Portfolio Domino View
  /dealroom/[id]/page.tsx     → Secure Dealroom (Auth0 gated)
  /feed/page.tsx              → Opportunity Shock Feed

/components
  /map
    MapCanvas.tsx             → DeckGL + Mapbox composition
    RainParticleOverlay.tsx   → Canvas rain animation
    BuildingLayer.tsx         → GeoJson polygon layer
    HeatmapLayer.tsx          → Opportunity cluster layer
    AlertTicker.tsx           → Horizontal scrolling news feed
    StateSelector.tsx         → Dropdown + transition trigger
    FiltersSidebar.tsx        → Score, sector, roof, cooling filters

  /building
    GenomeFingerprint.tsx     → Hexagonal SVG score visualization
    SatelliteViewer.tsx       → NAIP chip + mask + CT box overlay
    WaterTwin.tsx             → Scenario slider simulator
    WhyNowFeed.tsx            → Urgency catalyst cards
    DealStrategist.tsx        → Mode selector + AI memo output
    BoardroomClash.tsx        → Multi-persona debate UI
    VoicePitch.tsx            → Gemini + speechSynthesis trigger
    WRAIBadge.tsx             → Water Resilience Alpha Index display

  /shared
    ViabilityScoreRing.tsx    → Animated ring score display
    WaterMeterWidget.tsx      → Floating live counter
    BuildingCard.tsx          → Compact card for lists/ranked table
    ApprovalGate.tsx          → Auth0 human-in-the-loop modal
    GenomeBadge.tsx           → Archetype label pill

  /state-battle
    StateRadarChart.tsx       → Recharts radar overlay
    StatScoreCard.tsx         → Animated stat comparison card
    VerdictBanner.tsx         → AI market verdict display

/lib
  scoring.ts                  → Viability score + WRAI computation
  hydrology.ts                → Water capture formula engine
  adapters/                   → City municipal rule adapters (JSON + parser)
  edgar.ts                    → SEC filing fetch + NLP keyword extraction
  gemini.ts                   → Gemini API client (pitch, boardroom, verdict)
  claude.ts                   → Claude API client (deal memos, strategist)
  auth.ts                     → Auth0 role helpers

/store
  buildingStore.ts            → Selected building, state, filters (Zustand)
  alertStore.ts               → Shock ticker event queue
```

---

## Detailed Page & Feature Specifications

---

### Page 1: Landing / Mission Control Entry (`/`)

**Concept:** The moment a judge opens the URL, they are confronted with something they have never seen before. Not a hero section. Not a nav bar. The entire viewport is a slowly rotating satellite view of the US at night — city lights glowing below. Animated rain particles fall from the top of the screen in a subtle continuous loop. In the upper third, a single headline fades in letter by letter:

> *"Every rooftop is a water reservoir.*
> *Most companies don't know it yet."*

Below, a state selector dropdown in a frosted-glass card. One button: **"Find Opportunities."** In the lower right corner, the Live Water Waste Meter widget appears, already counting.

**Technical Details:**
- Background: Mapbox GL static satellite style, animated with a slow `flyTo` drift (0.01° longitude/second, imperceptible but alive)
- Rain particles: HTML5 Canvas overlay, 200 particles, `rgba(0, 229, 204, 0.6)` teal drops, physics-based fall with slight horizontal drift
- Headline: Framer Motion `staggerChildren` letter-by-letter reveal, 40ms per character, 800ms total
- State selector: Radix UI `Select` styled with Tailwind, search-filterable, groups states by water stress tier (High / Medium / Standard)
- Water Waste Meter: starts immediately, positioned as a fixed bottom-right widget, persists across all pages

**Auth0 integration:** Two login options visible in top-right corner as small text links: *"Grundfos Rep Login"* and *"Judge Preview."* Auth0 Universal Login handles both. Role is set in Auth0 user metadata and read on every page via `useUser()` hook.

---

### Page 2: Map Intelligence Dashboard (`/map`)

**Concept:** Full-screen dark map. This is the product's beating heart. Everything else orbits it. The top 5% of screen height is the Alert Ticker. The left side (320px) is a collapsible filter panel. The right side shows the building ranked table (drawer that slides in). The map occupies everything else.

**Map Layers (deck.gl):**

*Layer 1 — Opportunity Heatmap (background):*
`HeatmapLayer` showing density of high-score buildings as a deep teal-to-amber gradient fog over metro areas. This is the first thing the eye goes to — it shows *where the market is hottest* before any building is selected.

*Layer 2 — Building Polygons:*
`GeoJsonLayer` rendering building footprints. Color mapped to Viability Score:
- 0–40: `rgba(40, 50, 60, 180)` — nearly invisible dark gray
- 40–60: `rgba(29, 158, 117, 200)` — Grundfos teal
- 60–80: `rgba(55, 138, 221, 220)` — electric blue
- 80–100: `rgba(0, 229, 204, 255)` — full-brightness cyan glow

Buildings bloom onto the map sequentially on state load — sorted by score, highest first, each one appearing with a 30ms stagger and a scale-up from 0 to 1 using deck.gl's built-in transition. The effect is a cascade of glowing buildings materializing across the state, priority order.

*Layer 3 — Cooling Tower Icons:*
`IconLayer` placing a small 🌀 symbol (custom SVG icon) on buildings where cooling tower confidence > 0.7. Toggleable via filter sidebar.

*Layer 4 — Rain Particles (Canvas overlay):*
Canvas element absolutely positioned over the map `<div>`, `pointer-events: none`. 200 particles per second, each 1.5×6px teal line, falling at 2–4px/frame with subtle horizontal wind. When a particle's `x,y` position overlaps a building polygon's bounding box (checked against a spatial index), a `ripple` CSS class is added to that building's polygon for 800ms — creating the glow-and-fade ripple effect.

**Filter Sidebar:**
- State selector (updates map)
- Roof area slider (100k–500k+ sqft)
- Viability Score threshold (0–100)
- Sector filter (Data Center / Logistics / Manufacturing / Hospital / University / All)
- Cooling Tower toggle (Detected / Not Required / All)
- Drought severity filter (D1+ / D2+ / D3+ / Any)
- WRAI threshold (Act Now / High / Any)
- Incentive available toggle

All filters are applied client-side against the loaded state dataset (pre-fetched on state selection). No additional API calls for filtering.

**Alert Ticker:**
Fixed 48px bar above the map. CSS `marquee`-style scroll using `animation: scroll-left 40s linear infinite`. Events are a JSON array of 12–20 hardcoded alerts for Texas (for demo), each with type (drought / ordinance / rate / sec), affected building IDs, score delta, and timestamp. Clicking an event: map `flyTo` the affected buildings, buildings pulse orange for 2 seconds, score panel shows delta annotation.

**Building Ranked Table (right drawer):**
Slide-in from right (Framer Motion `x: 400 → 0`, spring physics). `@tanstack/react-table` instance with columns: Rank, Building Name, City, Genome Badge, Score Ring, Roof (sqft), Gallons/yr, Payback, WRAI Badge, Actions. Sortable by any column. Virtual scrolling for large lists. Clicking a row selects the building and flies the map to it.

---

### Page 3: Building Intelligence Detail (`/building/[id]`)

**Concept:** This is where the product shows its full depth. A split-layout: left panel is a stacked column of intelligence cards, right panel is the Satellite Viewer. On mobile, it's a vertical scroll. Every section is a distinct card with a clear visual hierarchy. The page feels like a classified intelligence dossier — not a property listing.

**Section 1 — Hero Header:**
Building name, address, Genome Archetype badge (large, colored pill), Viability Score as an animated ring (SVG circle, stroke-dashoffset animated from 0 to score value over 1.2s on mount), WRAI badge, and a row of three quick stats: Roof Area, Annual Gallons, Payback Years. Background: a subtle noise texture in deep navy.

**Section 2 — Satellite Viewer:**
The NAIP image chip displayed in a rounded card. On top of the image, rendered as SVG overlays:
- Roof mask: `rgba(0, 229, 204, 0.25)` filled polygon with `rgba(0, 229, 204, 0.8)` stroke
- Cooling tower detection boxes: amber `rgba(245, 166, 35, 0.9)` rectangles with confidence percentage labels (`84%`, `91%`)
- A small legend: Roof Mask / Cooling Towers / Confidence

Below the image: three confidence bars with monospace numbers — Roof Confidence, Cooling Tower Confidence, Data Completeness Confidence.

Toggle button: *"View Evidence"* expands to show the raw chip, masked chip, and detection chip side by side in a three-panel view.

**Section 3 — Genome Fingerprint:**
The hexagonal visualization. Six hexagons arranged in a honeycomb around a central label. Each hex is an SVG `polygon` with:
- Fill opacity proportional to sub-score (`opacity = score/100`)
- Color by pillar: Physical = teal (`#00E5CC`), Economic = amber (`#F5A623`), Regulatory = green (`#4ADE80`), Corporate = purple (`#A78BFA`), Drought = blue (`#60A5FA`), Flood = coral (`#FB7185`)
- Each hex pulses on a `@keyframes` breathing cycle (scale 1.0 → 1.04 → 1.0, duration varies 1.8s–2.6s per hex so they're never synchronized — feels organic)
- Center: archetype label in Syne font, 18px

On hover over any hex: a tooltip appears with the pillar name, exact score, and a one-line explanation of what drives it.

**Section 4 — Water Twin Simulator:**
A card with a mini animated diagram on the left (SVG: cloud → roof → cistern → pump → building uses, with animated water droplets flowing along `<path>` strokes using `stroke-dashoffset` animation) and controls on the right:

Scenario presets (pill buttons): Normal Year / D3 Drought / Rate Shock / Flood Year / Custom

Custom sliders:
- Annual Rainfall Adjustment (−40% to +20%)
- Water Rate Multiplier (1× to 2×)
- Reuse Fraction (50% to 95%)
- System Efficiency / Runoff Coefficient (0.75 to 0.95)

Live outputs update with `useDebounce(100ms)`:
- Annual Capture (gallons, M gallons)
- Annual Savings (USD)
- Payback Period (years)
- IRR (%)
- Stormwater Fee Avoidance (USD/yr)
- 20-year NPV

Below: a small Recharts `AreaChart` showing the cumulative savings curve over 20 years, with a vertical dashed line where cumulative savings crosses system CAPEX (the payback crossover moment, animated on slider change).

**Section 5 — Why-Now Event Feed:**
A vertical stack of event cards, each with:
- Type icon (🔴 drought, 🟡 regulation, 🟢 incentive, 📄 SEC, 💧 rate)
- Event description (plain language)
- Score impact badge (e.g., `+6 pts`)
- Timestamp (relative: "3 weeks ago")

Events are sourced from the alert store filtered to this building's jurisdiction and parent company. Maximum 5 events shown, ordered by score impact descending.

**Section 6 — AI Deal Strategist:**
Three mode tabs: **Sales** / **Engineering** / **Executive**

Below the tabs: a large bordered textarea (pre-filled placeholder: *"Generating your prospect brief..."*) that streams the Claude API response token by token using SSE. A small Grundfos logo watermark in the corner of the output box.

Below the output: *"Copy Brief"* button, *"Download PDF"* button (html-to-pdf for hackathon), and a *"Regenerate"* icon.

**Section 7 — Voice Pitch:**
A large circular glowing button (teal, 80px diameter, pulsing shadow `box-shadow: 0 0 20px rgba(0,229,204,0.6)` on `@keyframes`). Icon: a microphone.

On click:
1. Button state changes to "Generating..." with a spinner
2. Gemini API called with building data → returns 25-second script
3. Script passed to `window.speechSynthesis.speak(new SpeechSynthesisUtterance(script))`
4. Button state shows a live waveform animation (SVG bars with random-height `@keyframes`)
5. Transcript of the speech shown below in a monospace scrolling display

**Section 8 — Boardroom Clash:**
A card styled as a chat interface with a dark background.

Four avatar circles at top (initials + role label): CFO / Facilities VP / ESG Officer / Risk Manager.

*"Start Boardroom"* button triggers:
1. Single Gemini/Claude API call with system prompt returning a JSON array of 8–12 dialogue turns:
   ```json
   [
     {"persona": "CFO", "text": "A 4.2-year payback on $2.9M CAPEX is aggressive given our current CapEx cycle..."},
     {"persona": "ESG_Officer", "text": "Our 10-K literally cites water scarcity as a material risk. We've been warned."},
     ...
     {"persona": "Moderator", "verdict": "Proceed with site assessment. ESG mandate and drought exposure create board-level urgency that outweighs payback concern. Recommend Q2 pilot.", "confidence": 82}
   ]
   ```
2. Messages appear sequentially with 700ms delays, each with an animated entrance (slide up + fade)
3. Typing indicator (three dots) shows between messages
4. Final verdict from Moderator appears in a distinct card with a confidence ring

---

### Page 4: State Battle Arena (`/compare`)

**Concept:** A theatrical, animated comparison experience. Designed to be used live on a projector during a demo.

**Layout:**
The screen is split perfectly in half by a glowing vertical divider. Left = State A. Right = State B. Both sides have identical layouts.

**On state selection:**
- Score cards fly in from outside the screen edges (left card from left, right card from right) using Framer Motion `x: -600 → 0` and `x: 600 → 0` with spring physics
- Radar charts animate in behind the cards
- Stats count up from 0 to their values over 1.5 seconds

**Per-state display:**
- State name + silhouette (SVG outline of state shape)
- Aggregate stats: Total Buildings >100k sqft, Total Annual Opportunity (gallons), Average Viability Score, Top Incentive Value, Drought Severity
- Recharts `RadarChart` with 5 axes: Volume, ROI, Regulation, Corporate, Resilience

**Winner badges:** For each category, a small gold/silver badge appears under the state that wins that dimension. Categories: Volume 🏆 / ROI 🏆 / Regulatory Tailwind 🏆 / Corporate Readiness 🏆 / Climate Urgency 🏆.

**AI Verdict Banner:**
After both states load, a *"Generate Market Verdict"* button appears in the divider. On click, Claude/Gemini returns a 2-sentence strategic recommendation. It appears in a wide card spanning both halves with a typewriter animation.

**Top 5 Buildings per state:**
Below the main comparison, two columns of `BuildingCard` components (compact version), side by side. The highest-ranked building in each column pulses with a subtle glow.

---

### Page 5: Portfolio Domino View (`/portfolio/[owner]`)

**Concept:** Enterprise account strategy. This page answers: *"If we win this one building, how big is the real prize?"*

**Layout:**
Full-width map at the top (same Mapbox/deck.gl setup as the main map, but filtered to only show this owner's buildings, marked with custom icons). Below: a table of all owned buildings ranked by Viability Score.

**Header:**
Company name (pulled from SEC EDGAR), logo if available, total portfolio stats: Building Count, Combined Roof Area (sqft), Combined Annual Opportunity (gallons), Combined Potential Annual Savings (USD).

**"First Domino" Callout:**
A highlighted card at the top of the ranked list: *"Start Here."* The highest-score building with a narrative explanation: *"Winning this Dallas facility opens 7 similar sites across the same portfolio representing $4.2M in combined annual savings."*

**Map Animation:**
On page load, the map first zooms to the highest-score building, then animates out to show all buildings sequentially connected by glowing arc lines (deck.gl `ArcLayer`), forming a constellation — a visual metaphor for the portfolio domino effect.

---

### Page 6: Secure Dealroom (`/dealroom/[id]`)

**Concept:** A clean, professional dossier. This is what a Grundfos rep shares with a prospect or their sales manager. It strips away all the map chrome and delivers the evidence package in a printable, shareable, trustworthy format.

**Auth0 Gate:**
This route is protected. On access without authentication, Auth0 redirects to login. Role check on mount: only `grundfos_rep`, `grundfos_manager`, and `partner_view` (for their territory) can access. Judge Preview role gets read-only access to demo rooms.

**Content:**
The Dealroom is a long-scroll document-style page:
1. Building summary (name, address, genome archetype, score)
2. Satellite evidence panel (image + mask + detection, side by side)
3. Water Twin output (frozen snapshot of the default scenario — not interactive here)
4. ROI Summary (key numbers in a clean card grid)
5. Why-Now events (full list)
6. Generated Deal Memo (whichever mode was last generated)
7. Boardroom Verdict (if run)

**Human-in-the-Loop Approval Gate (Auth0 AI Agents):**
At the bottom of the page: *"Send This Dossier to Prospect."* Clicking triggers:
1. Auth0 AI Agent prepares the email action (recipient, subject, body)
2. An `ApprovalGate` modal appears: *"Your AI agent is ready to send this dossier to [Company Name]. Review the action before it executes."*
3. Shows email preview, recipient, and action log
4. *"Approve"* / *"Reject"* / *"Edit"* buttons
5. On Approve: action executes (simulated in demo — console.log, toast confirmation)
6. On Reject: action is logged as declined, modal closes

This entire flow demonstrates Auth0 AI Agents' async authorization model — the AI waits for a human to authorize before acting.

---

### Page 7: Opportunity Shock Feed (`/feed`)

**Concept:** A real-time intelligence briefing. Structured like a financial news terminal crossed with a weather alert system.

**Layout:**
A single-column feed of event cards, newest first, with a live "Last updated" timestamp in the header. Above the feed: a filter row for event type (Drought / Regulation / Rate / SEC / All) and state.

**Event Card:**
Each card contains:
- Type icon and color-coded left border (red = drought, amber = rate, green = incentive, blue = SEC)
- Event headline (bold, plain language)
- Affected building count and links (e.g., *"14 buildings in Dallas affected → View on Map"*)
- Score impact summary (*"Average score increase: +4.2 pts"*)
- Source attribution (US Drought Monitor / City of Austin / SEC EDGAR)
- Timestamp

**Live Simulation:**
Every 45 seconds in demo mode, a new event is injected into the feed from a pre-written queue (using `setInterval` + local state). It slides in from the top with a Framer Motion entrance. A notification dot appears on the nav link. This makes the feed feel genuinely live during a demo.

---

### Page 0: Welcome & Onboarding Setup (`/onboarding`)

**Concept:** A cinematic three-step wizard that new users complete exactly once. It is not a boring settings form — it is the moment the system comes alive around the user's specific needs. The background is the same animated rain-on-dark-map visual from the landing page, but blurred slightly so the setup cards feel elevated above the world they're about to unlock.

**Step 1 — Territory Selection:**
A full-screen card with an SVG map of the continental US. The DFW metroplex glows in teal with a pulsing ring animation. All other cities are rendered as dimmed gray dots labeled *"Coming Q3 2026"* or *"Coming Soon"* in small monospace type. A short sentence below: *"Your intelligence engine will scan this territory on every automation run."* The user confirms by clicking the glowing DFW marker, which triggers a satisfying scale-up and color intensification before advancing to Step 2.

**Step 2 — Automation Cadence:**
Three large card options side by side: **Daily**, **Weekly**, **Bi-Weekly**. Each card contains an icon (🌅, 📆, 🗓️), the interval name in Syne 22px, and a one-line description:
- Daily: *"Best for active territories. Catches threshold crossings within 24 hours."*
- Weekly: *"Balanced cadence. Recommended for most sales teams."*
- Bi-Weekly: *"Lower volume. Best when combined with a high score threshold."*

Selecting a card highlights it with a teal border and check mark. A subtle note below: *"You can change this anytime in Settings."*

**Step 3 — Score Threshold:**
A visually dominant full-width slider from 0 to 100, styled in the app's teal-on-navy palette with the slider thumb rendered as a glowing droplet icon. As the user drags, two live counters update below the slider:

```
At threshold 80: ~12 buildings in DFW currently qualify
                  Estimated: 2–4 new reports per week
```

Three preset quick-select buttons above the slider: **Conservative (90)** / **Balanced (75)** / **Aggressive (60)** — clicking snaps the slider to that value and updates the counters instantly.

**Confirmation Screen:**
A summary card shows the three chosen settings. A large *"Activate Intelligence Engine"* button at the bottom. On click: a particle burst animation (teal droplets radiating outward from the button), a 1.5-second loading state that says *"Initializing your automation engine..."*, then a redirect to `/` where the ElevenLabs debrief begins immediately and the map loads with the user's territory pre-selected.

**Technical Details:**
- Settings saved to Auth0 user `user_metadata` via Management API on confirmation
- Cron job initialized server-side with the chosen interval on first save
- `onboarding_complete: true` flag in user metadata gates future routing (skip to `/map`)
- New users detected via `!user.user_metadata?.onboarding_complete` check in `middleware.ts`

---

### Page 8: Automation Intelligence Center (`/automation`)

**Concept:** The engine room. This page shows the user that something is working on their behalf even when they're not logged in. It is simultaneously a control panel, a run history log, and a report feed — three sections in one scrollable page.

**Section 1 — Engine Status Panel:**
A large status card at the top of the page. Left side: a circular "pulse" animation (CSS `@keyframes` breathing ring in teal) with the label **ENGINE ACTIVE** in Space Mono caps. Right side: three stat blocks:
- *Next Run:* countdown timer in `HH:MM:SS` format (Space Mono, 28px)
- *Territory:* `DFW Metro`
- *Threshold:* the user's current score threshold with an edit pencil icon that opens an inline slider to adjust it on the fly

Below the status card: a horizontal settings summary row showing current cadence (Daily / Weekly / Bi-Weekly) as pill buttons where the active one is teal-filled. Clicking a different pill updates the schedule immediately with an optimistic UI update and a server call.

**Section 2 — Run History Timeline:**
A vertical timeline (CSS `::before` line with dot markers) showing all past automation runs in reverse chronological order. Each run entry contains:
- Timestamp (*"Thursday, April 10 · 6:00 AM"*)
- Buildings scanned count (`1,247 buildings evaluated`)
- Threshold crossings count (`3 buildings crossed threshold of 80`)
- Reports dispatched count with link (*"3 reports generated → View"*)
- Status badge: **Completed** (green) / **In Progress** (amber pulse) / **Failed** (red)

The most recent run is expanded by default, showing the three buildings that triggered reports as compact `BuildingCard` components with their score-at-trigger-time and a *"View Report"* button.

A *"Run Now"* button in the top-right of the section allows manual trigger at any time (useful for demo: *"Watch the full pipeline run in 30 seconds."*). Clicking it shows a live progress indicator with four stages: `Scanning Buildings → Evaluating Scores → Flagging Threshold Crossings → Running Sonar Research → Dispatching Reports`, each stage checking off as it completes.

**Section 3 — All Reports Feed:**
A full reverse-chronological list of every intelligence report ever generated by the automation engine for this user. Each report card:
- Building name, address, and genome archetype badge
- Score at trigger time (e.g., `Score crossed 80 → now 84`)
- Top contact discovered: name, title, company
- Automation run that generated it (linked)
- *"View Full Report"* button
- *"Send to Rep"* button (Auth0 approval gate)

Reports can be filtered by date range, score range, and genome archetype using the filter bar above the list.

---

### Page 9: Intelligence Report Detail (`/report/[id]`)

**Concept:** A classified-style dossier. Dark background, structured sections, monospace data labels, confidence badges on every data point. This is what gets sent to a rep — it should feel authoritative enough that they'd forward it to their manager without editing it.

**Header:**
Building name in large Syne type. Address. Score-at-trigger badge (*"Triggered at Score: 84"*). Genome archetype. Automation run timestamp. A *"Route to Rep"* button (Auth0 gated, triggers the approval modal).

**Section 1 — Ownership Intelligence:**
A structured card built from Perplexity Sonar output:

| Field | Value | Confidence |
|---|---|---|
| Legal Owner | Prologis LP | 🟢 High — county deed record |
| Corporate Parent | Prologis Inc. (NYSE: PLD) | 🟢 High — SEC filing |
| Business Type | Industrial REIT — Logistics | 🟢 High — SEC 10-K |
| Property Manager | CBRE Group | 🟡 Medium — multiple sources |
| Facility Use | Distribution / 3PL | 🟢 High — business license |

Each row has a colored confidence dot: 🟢 High (verified public record), 🟡 Medium (inferred, multiple sources), 🔴 Low (single source, unverified).

**Section 2 — Decision-Maker Contact:**
A contact card styled like a LinkedIn profile card: name, title, company, email (if found), LinkedIn URL (if found). Below: a *"Copy Contact"* button and a note on data source (*"Sourced from public business registry and LinkedIn public profile via Perplexity Sonar"*).

**Section 3 — Building Intelligence Summary:**
Key physical and financial stats (sourced from the platform's own scoring engine): roof area, cooling tower status, annual capture potential, payback estimate, active drought condition, applicable incentives.

**Section 4 — Outreach Pipeline:**
Three tab panels for the three Claude-generated outreach scripts, each pre-personalized using the Perplexity-discovered ownership and the building's water profile:

- **Cold Email:** Subject line + 4-paragraph body. Mentions the specific building, the company's known ESG commitments (from SEC), the active drought condition in their county, and the available Texas tax exemption.
- **LinkedIn Opener:** 3-sentence connection request message. References the company's sustainability goals by name.
- **Phone Script:** A 90-second phone opener with key talking points, likely objections, and suggested responses.

A *"Copy Script"* button on each tab. All three scripts are generated by Claude on report creation and stored — no additional API call needed on view.

**Section 5 — Score Rationale:**
The full explainable score breakdown showing why this building crossed the threshold — each pillar's score, the factors driving it, and the specific events (drought escalation, SEC mention, ordinance) that pushed it above the user's threshold at that moment. This section makes the report feel trustworthy and auditable, not like a black box.

---

### Page 10: Rep Notification Inbox (`/inbox`)

**Concept:** A clean, professional inbox experience. Minimal — not gamified, not over-designed. Reps have seen every gimmicky notification UI. This one feels like the Bloomberg Terminal of prospect inboxes: data-dense, fast, trustworthy.

**Auth0 Gate:** Route protected, visible only to `grundfos_rep` and `grundfos_manager`. Accessing as `demo_judge` shows a sample inbox populated with three demo reports.

**Header:**
Rep name (from Auth0 profile), territory badge (*"DFW Metro"*), and a summary stat: *"3 new prospects crossed your threshold this week."* A *"Mark All Read"* button and a sort control (Newest / Highest Score / Unread First).

**Notification Cards:**
Each card has a left border that is teal-glowing for unread and neutral-gray for read. Card contents:
- Building name and address (bold)
- Score at trigger (*"Score: 87 — crossed your threshold of 80"*)
- Genome archetype badge (color-coded pill)
- Top contact: name, title, company (first line of the dossier's decision-maker section)
- Automation run that generated it (*"Generated by Weekly Scan · Apr 10"*)
- Two action buttons: *"View Full Report →"* and *"Send Outreach"* (triggers Auth0 approval gate for the email action)

Clicking anywhere on the card navigates to `/report/[id]` and marks the notification as read.

**Empty State:**
If no reports have been generated yet (new user), a centered card with a rain animation behind it: *"Your engine is running. When a building crosses your threshold of [X], its full intelligence report will appear here."* A small progress indicator shows *"Next scan in: 6 hours 42 minutes."*

---

### Updated Component Architecture (additions)

```
/app
  /onboarding/page.tsx           → Three-step setup wizard
  /automation/page.tsx           → Automation Intelligence Center
  /report/[id]/page.tsx          → Intelligence Report Detail
  /inbox/page.tsx                → Rep Notification Inbox

/components
  /onboarding
    TerritorySelector.tsx        → SVG US map with DFW glow
    CadenceSelector.tsx          → Daily/Weekly/Bi-Weekly card picker
    ThresholdSlider.tsx          → Droplet-thumb slider with live count preview
    OnboardingConfirmation.tsx   → Settings summary + activation animation

  /automation
    EngineStatusPanel.tsx        → Pulse animation, countdown, settings
    RunHistoryTimeline.tsx       → CSS timeline with run entries
    RunNowButton.tsx             → Live pipeline progress indicator
    ReportsFeed.tsx              → Filtered list of all generated reports

  /report
    OwnershipTable.tsx           → Confidence-coded data table
    ContactCard.tsx              → Decision-maker profile card
    OutreachScripts.tsx          → Three-tab script display with copy
    ScoreRationale.tsx           → Explainable score breakdown

  /inbox
    NotificationCard.tsx         → Unread/read state card with actions
    InboxHeader.tsx              → Stats summary + sort controls

  /shared
    ElevenLabsDebriefPlayer.tsx  → Floating audio widget, waveform, transcript
    ApprovalGate.tsx             → Auth0 human-in-the-loop modal
```

---

### Updated Data Architecture (additions)

```
PostgreSQL + PostGIS (additions)
  user_settings          → user_id, territory, cadence, threshold, onboarding_complete
  automation_runs        → id, user_id, run_at, buildings_scanned, crossings_count, status
  automation_reports     → id, run_id, building_id, score_at_trigger, sonar_raw_json,
                           ownership_data, contact_data, outreach_scripts, routed_to_rep_id
  rep_notifications      → id, report_id, rep_id, read_at, actioned_at, action_type
  login_debriefs         → id, user_id, generated_at, script_text, elevenlabs_audio_url

FastAPI Routes (additions)
  GET  /api/settings/{user_id}                 → User automation settings
  POST /api/settings/{user_id}                 → Save onboarding config, init cron
  GET  /api/automation/runs?user={}            → Run history for Automation Center
  POST /api/automation/run-now                 → Manual trigger (demo mode)
  GET  /api/reports?user={}&filters={}         → All reports feed
  GET  /api/report/{id}                        → Full intelligence report
  POST /api/report/{id}/route                  → Route to rep (Auth0 gated)
  GET  /api/inbox?rep_id={}                    → Rep notification inbox
  POST /api/inbox/{id}/read                    → Mark notification read
  GET  /api/debrief/{user_id}                  → Latest login debrief script + audio URL
  POST /api/debrief/generate                   → Trigger fresh ElevenLabs debrief

Automation Engine (Celery + Redis)
  tasks/scan_territory.py        → Cron task: rescore buildings, detect crossings
  tasks/run_sonar.py             → Perplexity Sonar API call per flagged building
  tasks/generate_report.py       → Assemble report from Sonar + score data
  tasks/route_to_rep.py          → Assign report to nearest rep, create notification
  tasks/generate_debrief.py      → Claude script generation + ElevenLabs TTS on login
```

---

```
PostgreSQL + PostGIS
  buildings            → id, polygon, centroid, state, city, roof_sqft, area_confidence
  cv_results           → building_id, ct_detected, ct_confidence, roof_mask_url, roof_confidence
  climate_data         → building_id, annual_rain_in, drought_score, flood_zone, fema_class
  financial_data       → building_id, water_rate, sewer_rate, stormwater_fee_annual
  incentive_adapters   → city_id, rebate_usd, mandate_threshold_sqft, tax_exempt, credit_pct
  corporate_data       → building_id, owner_name, sec_cik, esg_score, water_mentions, filing_year
  viability_scores     → building_id, final_score, physical, economic, strategic, wrai, genome
  alert_events         → id, type, building_ids[], score_delta, description, timestamp

FastAPI Routes
  GET  /api/buildings?state={}&filters={}    → Ranked building list for map
  GET  /api/building/{id}                    → Full building intelligence record
  GET  /api/building/{id}/harvest            → Water Twin computation
  POST /api/building/{id}/memo               → Claude deal memo generation
  POST /api/building/{id}/boardroom          → Boardroom clash simulation
  POST /api/building/{id}/voice-script       → Gemini voice pitch script
  GET  /api/states/{a}/vs/{b}               → State battle comparison data
  GET  /api/portfolio/{owner}               → Portfolio domino data
  GET  /api/alerts?state={}                 → Alert feed events
```

---

## AI Integration Architecture

**Claude API (claude-sonnet-4-6):**
- Deal Strategist memos (Sales / Engineering / Executive modes)
- Boardroom Clash multi-persona dialogue generation
- State Battle market verdict generation
- Building archetype narrative generation

**Gemini API:**
- Voice Pitch script generation (Gemini 2.0 Flash for speed)
- HydroDeliberation: selecting the dominant opportunity thesis per building (rain ROI vs. cooling reuse vs. resilience/flood)
- Multimodal satellite image analysis and description (Gemini Vision): *"This rooftop structure appears to be a multi-cell induced-draft cooling tower based on fan visibility and rectangular basin configuration."*

**Auth0:**
- Universal Login (social + passwordless) for fast demo access
- Role-based route protection (`grundfos_rep`, `grundfos_manager`, `partner_view`, `demo_judge`)
- Human-in-the-Loop approval gate for AI agent actions (Dealroom send action, rep routing action)
- Fine-grained access: `partner_view` users only see their assigned state's buildings
- User `user_metadata` stores onboarding config (territory, cadence, threshold) and `onboarding_complete` flag

**Perplexity Sonar API:**
- Live web-search synthesis for automation-triggered building research
- Called once per building that crosses the user's Viability Score threshold during an automation run
- Returns structured intelligence: ownership chain, corporate parent, business purpose, licensing status, decision-maker contact information, recent news and sustainability commitments
- Results stored in `automation_reports` table and assembled into the Intelligence Report Detail dossier
- Confidence scoring applied to each discovered data point based on source count and record type

**ElevenLabs Text-to-Speech API:**
- Called on every user login to generate the personalized Intelligence Debrief audio
- Input: Claude-generated debrief script (45–60 seconds, ~130 words) built from live territory data, recent automation results, top prospect scores, and active market alerts
- Output: streamed MP3 audio played via the `ElevenLabsDebriefPlayer` floating widget
- Audio URL and transcript stored in `login_debriefs` table so the user can replay the most recent debrief from any page
- Voice model: *Rachel* or *Adam* (configurable in user settings) — a warm, professional, distinctly non-robotic voice that signals intelligence, not automation

---

## Hackathon Demo Script (10 Minutes)

1. **(0:00)** Open fresh tab — Auth0 login screen. Log in as new user. *"Let's set this up from scratch."* Onboarding wizard appears. Select DFW. Choose Weekly cadence. Drag threshold to 80 — counter shows *"~12 buildings qualify."* Hit *"Activate Intelligence Engine."* Particle burst. *"The engine is now running. Let's see what it found."*

2. **(1:00)** Landing page loads. ElevenLabs debrief begins playing softly. Point to the floating audio widget. *"Every login, the system briefs you. No dashboard-reading required."* Let it play 15 seconds.

3. **(1:30)** Map loads with DFW pre-selected. Rain particles falling. Alert ticker running. *"14,000 buildings. Pre-scored. Ranked. Waiting."*

4. **(2:00)** Apply filters: roofs >150k sqft, cooling towers detected, WRAI *"Act Now."* Down to 38. *"These 38 buildings need a Grundfos conversation right now."*

5. **(2:30)** Click the top-ranked building. Genome Fingerprint animates in. Show satellite viewer with roof mask and cooling tower boxes. *"AI-confirmed. 142,000 square feet of catchment area. Two cooling towers at 84% confidence."*

6. **(3:15)** Open Water Twin. Drag drought slider to D3. Watch payback shrink. *"Drought makes this more attractive. The worse the water gets, the better the ROI."*

7. **(3:50)** Hit **"Generate Voice Pitch."** Let it speak. Watch the room.

8. **(4:30)** Hit **"Start Boardroom."** CFO vs ESG Officer debate plays out. Point at verdict: *"The AI just closed itself."*

9. **(5:15)** Navigate to `/automation`. Show the Engine Status Panel — countdown to next scan, last run timestamp. *"This ran this morning at 6 AM. Nobody told it to."* Expand the last run entry: 3 buildings crossed threshold 80. *"Three new prospects. Zero manual work."*

10. **(5:50)** Hit **"Run Now"** button. Show the live pipeline progress: `Scanning → Scoring → Flagging → Running Sonar Research → Dispatching`. All four stages check off in 30 seconds. *"That's the entire prospecting workflow. 30 seconds. Automated."*

11. **(6:30)** Navigate to `/inbox`. Show three notification cards with teal unread borders. Open the top report. Show the ownership table with confidence badges, decision-maker contact card, and three outreach scripts. *"Perplexity Sonar found who owns it, who runs it, and how to reach them. Claude wrote the email."*

12. **(7:00)** Hit *"Send Outreach."* Auth0 approval gate appears. *"The AI assembled the action. It's waiting for a human to say yes. That's the right way to deploy AI in an enterprise."* Hit Approve. Toast confirmation. *"Done."*

13. **(7:30)** Switch to State Battle Arena. Texas vs Philadelphia. Cards fly in, radar charts overlay. AI verdict drops. *"Same engine. Different market logic. The platform adapts."*

14. **(8:00)** Open Portfolio Domino view. Arc constellation on the map. *"One building. Eight more like it. That's what one deal really means for Grundfos."*

15. **(8:40)** Back to landing page. Counter still ticking up. ElevenLabs debrief still in the widget. *"RainUSE Nexus doesn't just find where water reuse is possible — it finds where it's becoming inevitable, researches the building overnight, writes the email, and briefs you when you wake up. Possibility in every drop."*

---

## Winning Statements per Track

| Track | The Line |
|---|---|
| **Best Sponsor (Grundfos)** | *"We turned Grundfos's prospecting problem into a building intelligence platform that finds the right customer, researches them overnight, writes the email, and briefs the rep at login — all without anyone asking it to."* |
| **Best UI/UX** | *"We made water scarcity feel like a living emergency, not a spreadsheet. The map rains. The buildings glow. The numbers count in real time. And when you log in, the system speaks to you."* |
| **Best Use of AI** | *"Our AI doesn't just score buildings — it runs while you sleep, researches ownership chains, debates the deal, pitches it out loud, and waits for your approval before sending anything. Five AI systems. One seamless workflow."* |
| **Most Innovative Idea** | *"We gave every commercial rooftop a Water DNA, a Resilience Alpha score, and an autonomous sales team that operates on a schedule, briefs you by voice, and delivers ready-to-send outreach by morning."* |
| **Best Use of Gemini** | *"Gemini reads the roof, writes the pitch, voices it aloud, and argues four sides of the deal — all from a single building click."* |
| **Best Use of Auth0** | *"Auth0 doesn't just log reps in — it stores their intelligence preferences, gates their report access by territory, and makes the AI wait for a human to say yes before sending anything. Identity-aware intelligence."* |
| **Best Use of ElevenLabs** | *"Every login begins with a voice briefing — personalized, data-grounded, delivered before the user touches a single button. The system doesn't wait to be asked. It tells you what you need to know."* |

---

*RainUSE Nexus · Built for the Poul Due Jensen / Grundfos Foundation Hackathon · April 2026*
*"Possibility in Every Drop"*
