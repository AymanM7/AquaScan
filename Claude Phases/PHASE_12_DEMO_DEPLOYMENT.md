# PHASE 12 — Demo Polish, Deployment & Hackathon Readiness
## Final integration, performance hardening, demo mode, and submission prep

**Prerequisite:** Phases 00–11 complete. All features built and individually verified.

---

## 1. Objective

This is the final phase. It transforms a working prototype into a **demo-ready, judge-proof, score-maximizing submission**. It covers:

1. **Demo mode configuration** — locked state, instant data, no spinners during live demo
2. **Performance hardening** — fast load, no broken states, graceful fallbacks
3. **API fallback layer** — every AI call has a hardcoded mock response for network failure
4. **Seed data audit** — verify all demo buildings tell the right story
5. **Deployment** — frontend on Vercel, backend on Railway/Render, environment variables
6. **Demo script integration** — timing, which page to have open, which clicks to make
7. **Submission checklist** — everything judges expect to see

---

## 2. Demo Mode System

### 2.1 Demo Mode Flag

```tsx
// lib/demoMode.ts
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// When DEMO_MODE is true:
// - All AI calls use pre-generated mock responses (instant, no spinner)
// - Feed simulation fires after 15s instead of 45s (impatient judges)
// - "Run Now" automation shows fake pipeline progress that completes in 8 seconds
// - Auth gates show demo_judge login pre-filled
// - WaterWasteMeter uses a slightly elevated starting value for dramatic effect
```

### 2.2 AI Mock Response Layer — `lib/mockResponses.ts`

For every AI endpoint, store a pre-generated response that fires instantly when `DEMO_MODE=true` or when the real API call times out (>10s):

```typescript
export const MOCK_RESPONSES = {
  
  // Deal memo — Sales mode
  dealMemo_sales: `Prologis's Dallas Distribution Center sits on one of the most water-exposed logistics footprints 
in North Texas. With 142,000 square feet of catchment area, this facility can capture 2.56 million gallons 
annually — enough to eliminate 87% of its cooling tower makeup water demand. At DFW's combined utility rate 
of $9.60 per thousand gallons and an active Texas Commercial Rebate of $5,000, the payback is 4.1 years 
with a 20-year NPV of $1.4 million. Prologis's own 2024 10-K names water scarcity as a material risk 
and commits to a 15% reduction in operational water intensity by 2030. This system doesn't just cut cost — 
it fulfills the commitment they already made to their investors.`,

  // Deal memo — Executive mode
  dealMemo_executive: `The conversation with Prologis's facilities leadership begins with their own words: 
"Water availability is a material risk to our operational continuity." Their 2024 10-K says it. Dallas County's 
D2 drought designation makes it real. A Grundfos RainUSE system at this site turns their stated ESG commitment 
into operational proof — the kind of verification that moves climate risk disclosures from footnotes to 
board-level progress reports. First-mover adoption here opens the conversation for eight comparable Prologis 
assets in the DFW region, representing a combined $4.2M in annual savings potential and a replicable 
deployment template that eliminates procurement friction across their national portfolio.`,

  // Deal memo — Engineering mode
  dealMemo_engineering: `System specification for Prologis DFW Distribution Center: 142,000 sqft TPO membrane 
roof with 5° average pitch (pitch multiplier 0.97). Annual design rainfall 34 inches (DFW 30-year average), 
D2 drought scenario uses 22.1 inches. Designed annual capture: 2.56M gallons (base), 1.67M gallons (D3 
scenario). Recommended cistern: 150,000 gallon underground HDPE with 6-inch overflow. Pump specification: 
Grundfos CM Series 3-5 bar supply to cooling tower make-up and irrigation circuits. Integration path: 
tie into existing cooling tower basin float valve with backpressure regulator. Estimated CAPEX: $380,000. 
Permitting: Texas Commission on Environmental Quality (TCEQ) RU permit class — Class 2 greywater reuse.`,

  // Boardroom dialogue
  boardroomDialogue: [
    { persona: "CFO", text: "A $380,000 system with a 4.1-year payback is aggressive given our current cap-ex cycle. We're not here to be a water utility." },
    { persona: "ESG_Officer", text: "We literally put water scarcity in the 10-K as a material risk last quarter. If we walk away from a system that directly addresses that disclosure, we have a credibility problem with investors." },
    { persona: "Facilities_VP", text: "My concern is installation timeline. The Q3 lease renewals in this building — I don't want tenants looking at active construction." },
    { persona: "Risk_Manager", text: "The D2 drought designation changes my calculus. DFW utilities have signaled a 7–12% rate increase in the next 18 months. Every year we wait, the payback calculation moves against us." },
    { persona: "CFO", text: "If the rate trajectory holds, you're telling me we're looking at a 3.2-year payback by the time we execute in Q2?" },
    { persona: "ESG_Officer", text: "And a $5,000 rebate from the Texas Commercial program that expires Q4. We lose that by waiting." },
    { persona: "Facilities_VP", text: "If Grundfos can phase the installation to avoid the Q3 renewal window, I can work with a Q4 construction start." },
    { persona: "Risk_Manager", text: "Phased installation reduces construction risk. I'm comfortable with a staged commitment if the contract includes performance guarantees." },
    { persona: "CFO", text: "Assuming the Grundfos performance guarantee holds and the Q4 install timeline is firm — I can approve this for Q2 board package." },
    { persona: "Moderator", verdict: "Proceed with site assessment and proposal. ESG mandate, drought exposure, and rate trajectory create board-level urgency that outweighs payback concern. Recommend Q2 pilot authorization with phased Q4 installation. Confidence: 88%.", confidence: 88 }
  ],

  // Voice pitch script (25 seconds when read at 150 wpm)
  voicePitch: `This Dallas distribution center has 142,000 square feet of roof and 34 inches of rain falling on it 
every year. That's 2.56 million gallons — enough to eliminate 87% of cooling tower water costs. At today's 
DFW rates, that's $188,000 saved annually. Payback: 4.1 years. And Prologis already told their investors 
water scarcity is a material risk. Grundfos turns that risk into proof. One building. One conversation.`,

  // State battle verdict — TX vs PA
  stateBattleVerdict: `Texas leads on total opportunity volume — 847 qualifying buildings and 4.1 billion gallons 
of annual potential — making it the right market for Q1 pipeline building. Pennsylvania, however, offers 
superior regulatory velocity: $100,000-per-acre green infrastructure grants and 45% stormwater fee credits 
create compressed deal cycles with higher per-site ROI. Deploy Texas for volume; activate a Pennsylvania 
pilot simultaneously to capture the 2027 incentive window before it closes.`,

  // Login debrief script (130 words, ~45 seconds)
  loginDebrief: `Good morning. Your DFW territory is showing elevated urgency today. Fourteen buildings have 
been re-ranked following Dallas County's escalation to D2 drought conditions — the top building, Prologis's 
Irving distribution center, now scores 89, up from 82 last week. Your automation engine ran this morning 
at 6 AM and flagged three new threshold crossings above your score of 80. Perplexity research reports are 
ready in your inbox for all three. The highest-priority contact is Marcus Webb, Facilities Director at 
Prologis Dallas — his LinkedIn confirms recent activity on sustainability initiatives. Texas water rates 
are projected to rise 7.2 percent in the next billing cycle. Opportunity is peaking. Let's move.`,
}
```

### 2.3 AI Call Wrapper — `lib/aiCall.ts`

```typescript
import { DEMO_MODE, MOCK_RESPONSES } from './demoMode'

export async function aiCall<T>(
  key: keyof typeof MOCK_RESPONSES,
  realCallFn: () => Promise<T>,
  transform: (raw: string) => T
): Promise<T> {
  if (DEMO_MODE) {
    // Return mock instantly with 800ms simulated delay (looks real)
    await delay(800)
    return transform(MOCK_RESPONSES[key] as string)
  }
  
  try {
    return await Promise.race([
      realCallFn(),
      timeout(12_000, `AI call ${key} timed out`)
    ])
  } catch (err) {
    console.warn(`[AI Fallback] ${key} → using mock response`)
    return transform(MOCK_RESPONSES[key] as string)
  }
}

function delay(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)) }
function timeout(ms: number, msg: string) {
  return new Promise<never>((_, reject) => setTimeout(() => reject(new Error(msg)), ms))
}
```

---

## 3. Performance Hardening

### 3.1 SWR Configuration — `lib/swrConfig.ts`

```tsx
// app/layout.tsx — wrap in SWRConfig
import { SWRConfig } from 'swr'

const swrConfig = {
  fetcher: async (url: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },
  revalidateOnFocus: false,      // Don't refetch on tab focus — reduces flicker
  dedupingInterval: 30_000,      // 30-second cache window
  errorRetryCount: 2,            // Only retry twice on error
  loadingTimeout: 5000,          // Fire onLoadingSlow after 5s
  onLoadingSlow: (key: string) => console.warn(`[Slow] ${key} taking >5s`),
  onError: (error: Error, key: string) => {
    console.error(`[SWR Error] ${key}:`, error.message)
  },
}
```

### 3.2 Skeleton Loading States

Every data-dependent section must show a skeleton loader (not a blank space or spinner) while fetching:

```tsx
// components/shared/SkeletonCard.tsx
export function SkeletonCard({ height = 120, lines = 3 }: { height?: number, lines?: number }) {
  return (
    <div className="card" style={{ height }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height: 14,
            width: i === lines - 1 ? '60%' : '100%',
            marginBottom: 10,
          }}
        />
      ))}
    </div>
  )
}
```

Critical loading states to implement:
- **Map**: show `SkeletonCard` overlay on left sidebar while buildings load
- **Building Detail**: skeleton for all 8 sections until data arrives
- **Reports Feed**: 5 skeleton cards while fetching
- **Inbox**: 3 skeleton notification cards
- **Compare**: skeleton panels while state data fetches

### 3.3 Error Boundaries

```tsx
// components/shared/ErrorBoundary.tsx
// Wrap every major page section:
<ErrorBoundary fallback={<FallbackCard message="Data unavailable — check your connection." />}>
  <BuildingIntelligenceCards building={building} />
</ErrorBoundary>
```

The `FallbackCard` shows an appropriate message and a "Retry" button that calls `mutate()` on the SWR key. No page should crash entirely from a single API failure.

### 3.4 Map Performance

```tsx
// components/map/BuildingLayer.tsx
// For 500+ buildings, enable deck.gl binary data format:
const layer = new ScatterplotLayer({
  data: buildings,
  getPosition: d => [d.centroid_lng, d.centroid_lat],
  // Binary mode:
  _binary: true,  // deck.gl 8.x binary mode
  // Or: use PointCloudLayer for very large datasets
  
  // Cluster nearby buildings at low zoom:
  // Use deck.gl IconClusterLayer at zoom < 10
  // Transition to individual building polygons at zoom >= 10
})

// Polygon layer: only render polygons for buildings currently in viewport
// Use deck.gl DataFilterExtension to filter by bounds:
const polygonLayer = new GeoJsonLayer({
  data: buildingFeatures,
  extensions: [new DataFilterExtension({ filterSize: 1 })],
  getFilterValue: d => d.properties.final_score,  // Only render if score passes filter
  filterRange: [minScore, 100],
})
```

---

## 4. Seed Data Story Audit

Before demo, verify these narrative beats work end-to-end:

### Primary Demo Building — "The Anchor"
```
Building: Prologis DFW Distribution Center #1 (Irving, TX)
Address: 3200 W Rochelle Road, Irving, TX 75062
Viability Score: 89
Genome Archetype: Cooling-Driven Reuse Giant
Roof: 142,000 sqft
Annual Gallons: 2,560,000
Payback: 4.1 years
IRR: 24.2%
Cooling Towers Detected: 2 (84% confidence, 91% confidence)
Drought: D2 — Severe
Corporate Parent: Prologis Inc. (NYSE: PLD)
ESG Score: 78
Water Mentions in 10-K: 8
LEED Certified: LEED Silver
SEC CIK: 0001045810
Alert Events: D2 escalation (+6.2 pts), Prologis 10-K (+3.4 pts), rate increase (+1.8 pts)
Contact: Marcus Webb, Facilities Director — marcus.webb@prologis.com (mock)
```

This building must score exactly 89 after all contributing events are applied. Verify the scoring engine (Phase 02) produces this output from the seeded data.

### The Comparison Foil
```
Building: Dallas Industrial Park — Building C (Garland, TX)
Viability Score: 61
Genome Archetype: Hidden High-ROI Candidate
Roof: 98,000 sqft  ← just below 100k, gives the filter demo contrast
Cooling Towers: Not detected (32% confidence)
Drought: D1 — Moderate
```

This building appears in the map but is filtered OUT when the user applies `roof > 100k sqft AND cooling_tower = true`. Demo moment: *"Filter applied. 38 buildings. Zero ambiguity."*

### The ESG Story Building
```
Building: Amazon DFW Distribution Facility (Coppell, TX)
Viability Score: 84
Genome Archetype: ESG Mandate Accelerator
Corporate Parent: Amazon.com Inc.
Water Mentions in 10-K: 14  ← highest in dataset
LEED Certified: LEED Gold
Payback: 3.7 years  ← fastest in dataset
```

Used in the Portfolio Domino view: `/portfolio/amazon` shows 3 Amazon buildings.

---

## 5. Auth0 Configuration for Demo

### 5.1 Demo User Accounts (pre-create in Auth0 dashboard)

```
demo_rep@grundfos.com     password: Demo2026!  role: grundfos_rep    territory: TX
demo_judge@rainuse.io     password: Demo2026!  role: demo_judge      territory: TX (read-only)
demo_manager@grundfos.com password: Demo2026!  role: grundfos_manager territory: TX
```

All users have `user_metadata.onboarding_complete = true` so they skip onboarding.
All users have `user_metadata.territory = "TX"`, `threshold = 80`, `cadence = "weekly"`.

### 5.2 Auth0 Custom Claims Action

```javascript
// Auth0 Actions → Login → Add custom claims
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://rainuse.io/'
  
  // Add roles to token
  const roles = event.authorization?.roles || []
  api.idToken.setCustomClaim(`${namespace}roles`, roles)
  api.accessToken.setCustomClaim(`${namespace}roles`, roles)
  
  // Add territory from metadata
  const territory = event.user.user_metadata?.territory || 'TX'
  api.idToken.setCustomClaim(`${namespace}territory`, territory)
  
  // Add threshold
  const threshold = event.user.user_metadata?.score_threshold || 80
  api.idToken.setCustomClaim(`${namespace}threshold`, threshold)
}
```

### 5.3 Quick Login for Hackathon Demo

Add a "Demo Login" button on the Auth0 login page or landing page:

```tsx
// On landing page, below the main CTA:
{DEMO_MODE && (
  <button
    className="demo-login-btn"
    onClick={() => loginWithRedirect({
      authorizationParams: {
        login_hint: 'demo_rep@grundfos.com',
      }
    })}
  >
    → Demo Login (Grundfos Rep)
  </button>
)}
```

---

## 6. Deployment

### 6.1 Frontend — Vercel

```bash
# vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_DEMO_MODE": "true",
    "NEXT_PUBLIC_API_URL": "https://rainuse-api.railway.app",
    "NEXT_PUBLIC_AUTH0_DOMAIN": "...",
    "NEXT_PUBLIC_AUTH0_CLIENT_ID": "...",
    "NEXT_PUBLIC_MAPBOX_TOKEN": "..."
  }
}

# Deploy:
# npx vercel --prod
# Expected URL: https://rainuse-nexus.vercel.app
```

**Vercel environment variables:** Set all `NEXT_PUBLIC_*` vars in Vercel Dashboard → Project → Environment Variables.

### 6.2 Backend — Railway

```toml
# railway.toml
[build]
builder = "nixpacks"
buildCommand = "pip install -r requirements.txt"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 30

# Railway services needed:
# 1. FastAPI web service (this config)
# 2. PostgreSQL + PostGIS plugin (Railway managed)
# 3. Redis plugin (Railway managed)
# 4. Celery worker: separate service, startCommand = "celery -A tasks worker -l info"
# 5. Celery beat: separate service, startCommand = "celery -A tasks beat -l info"
```

**Railway database URL:** Automatically provided as `DATABASE_URL` env var.

**Post-deploy startup sequence:**
```bash
# Run once after first deploy:
railway run alembic upgrade head
railway run python seed/seed_dfw.py

# Verify:
curl https://rainuse-api.railway.app/health
curl "https://rainuse-api.railway.app/api/buildings?state=TX" | jq '.count'
```

### 6.3 Static Assets

Satellite imagery chips, audio files, and generated PDFs:
- Use **Cloudflare R2** (free tier: 10GB storage, 1M requests/month)
- Or use **Supabase Storage** (free tier: 1GB)
- Or serve from `/public/demo-assets/` folder in Next.js for hackathon (simplest)

```
/public/demo-assets/
  chips/
    prologis_irving_raw.jpg
    prologis_irving_masked.jpg
    prologis_irving_detection.jpg
    amazon_coppell_raw.jpg
    amazon_coppell_masked.jpg
  audio/
    debrief_demo_rep.mp3   ← pre-generated ElevenLabs audio
```

---

## 7. The 10-Minute Demo Checklist

Before walking on stage, verify every step of the demo script works end-to-end:

```
[ ] Auth0 login page loads at root URL
[ ] demo_rep@grundfos.com login works with password Demo2026!
[ ] Landing page: ElevenLabs debrief begins playing within 3 seconds
[ ] Debrief transcript scrolls in sync with audio
[ ] Map loads with DFW pre-selected, buildings visible, rain particle animation running
[ ] Alert ticker scrolling with 5+ events
[ ] WaterWasteMeter widget visible and counting
[ ] Filter: roof >150k, cooling_tower=true, WRAI=Act Now → ~38 buildings remain
[ ] Click Prologis Irving building → detail page loads <1.5 seconds
[ ] Genome Fingerprint hexagons animate on arrival
[ ] Satellite viewer shows roof mask (teal polygon) and CT boxes (amber rectangles)
[ ] Water Twin loads with correct default outputs
[ ] Drag D3 drought scenario → outputs update, payback shrinks
[ ] "Generate Voice Pitch" button → speaks within 2 seconds
[ ] "Start Boardroom" → 10 dialogue turns appear with delays, verdict appears
[ ] Navigate to /automation → Engine Status Panel shows ACTIVE, countdown timer running
[ ] Last run entry shows 3 threshold crossings
[ ] "Run Now" → pipeline progress stages check off in 8 seconds
[ ] Navigate to /inbox → 3 notification cards with teal unread borders
[ ] Click top notification → /report/[id] loads with full dossier
[ ] Ownership table has confidence dots (green/amber/red)
[ ] Contact card shows Marcus Webb
[ ] Outreach scripts: 3 tabs work, copy buttons work
[ ] Navigate to /dealroom/[id] → evidence package in scroll layout
[ ] "Send This Dossier" → ApprovalGate modal opens
[ ] Modal shows email preview and recipient
[ ] "Approve & Send" → success toast appears
[ ] Navigate to /compare → TX vs PA loads with animated panel entrance
[ ] "Generate Market Verdict" → typewriter animation plays verdict
[ ] Navigate to /portfolio/prologis → 6 buildings, arc constellation on map
[ ] Navigate to /feed → 15+ events, filter pills work
[ ] Inject demo event (or wait 15s for simulation) → event slides in from top
[ ] Nav notification dot appears
```

**If any check fails: have a recorded screen capture ready as backup.**

---

## 8. Judge Talking Points by Track

### Best Sponsor Use (Grundfos)
*"We turned Grundfos's prospecting problem into a building intelligence platform that finds the right customer, researches them overnight, writes the email, and briefs the rep at login — without anyone asking it to. Every feature is grounded in actual Grundfos sales motion: territory, threshold, rep routing, and the final human approval gate."*

### Best UI/UX
*"The map rains. The buildings glow. The numbers count in real time. When you log in, the system speaks to you. Every data signal has a visual encoding: drought is red, incentives are green, urgency scores pulse. We made water scarcity feel like a living emergency — not a spreadsheet."*

### Best Use of AI — Five Systems, One Flow
| System | Role |
|---|---|
| Claude API | Deal memos, boardroom personas, market verdicts, debrief scripts |
| Gemini API | Voice pitch scripts, satellite image descriptions, HydroDeliberation |
| Perplexity Sonar | Automated overnight ownership research, contact discovery |
| ElevenLabs | Voice delivery of the login intelligence debrief |
| Auth0 AI Agents | Human-in-the-loop approval gate — AI waits for authorization |

### Best Use of Auth0
*"Auth0 doesn't just log reps in — it stores their intelligence preferences, gates report access by territory role, and implements the AI Agent approval pattern: the system assembles an action and waits for human authorization before executing. That's enterprise-grade AI governance in 10 seconds on a demo stage."*

### Most Innovative Idea
*"We gave every commercial rooftop a Water DNA fingerprint, a Resilience Alpha score, and an autonomous sales team that operates on a schedule, briefs you by voice, and delivers ready-to-send outreach by morning. The building pitches itself. The system closes itself. The rep approves."*

---

## 9. Final Submission Checklist

```
[ ] GitHub repo public (or submitted) with clean README
[ ] README includes: demo URL, demo login credentials, 1-paragraph description
[ ] All env vars documented in .env.example (no actual secrets)
[ ] Demo URL live and accessible (Vercel + Railway)
[ ] Seed data complete: 55 TX buildings, 15 alerts, 3 demo reports in inbox
[ ] All 5 primary demo buildings have full data across all tables
[ ] All AI API calls have mock fallbacks
[ ] DEMO_MODE=true set in Vercel environment
[ ] Auth0 demo users created with correct roles
[ ] ElevenLabs pre-recorded debrief audio saved as fallback in /public
[ ] Screen recording of full 10-minute demo flow saved as backup
[ ] Hackathon submission form completed with: team name, track selections, 
    project name (RainUSE Nexus), tech stack tags, demo URL, repo URL
[ ] "Possibility in Every Drop" — Grundfos tagline visible somewhere on landing page
```

---

## 10. What is Required vs Optional for Hackathon Scope

| Feature | Status | Priority |
|---|---|---|
| Map with building polygons + rain animation | Required | P0 |
| Viability Score + filter | Required | P0 |
| Building Detail with Genome + Water Twin | Required | P0 |
| ElevenLabs debrief player | Required | P0 |
| Automation Center + Run Now | Required | P0 |
| Inbox + Reports | Required | P0 |
| Dealroom + ApprovalGate | Required | P0 |
| State Battle Arena (/compare) | Required | P0 |
| Voice Pitch (Gemini + speechSynthesis) | Required | P0 |
| Boardroom Clash | Required | P0 |
| WaterWasteMeter widget | Required | P0 |
| Portfolio Domino (/portfolio) | Recommended | P1 |
| Opportunity Shock Feed (/feed) | Recommended | P1 |
| Full Onboarding wizard (/onboarding) | Recommended | P1 |
| WRAI badge system | Recommended | P1 |
| Satellite image chips (real NAIP) | Optional | P2 |
| Real SEC EDGAR scraping | Optional | P2 |
| Multi-state data beyond TX | Optional | P2 |
| Mobile responsive design | Optional | P2 |
| PDF report download | Optional | P2 |
| Real-time Celery automation (vs demo trigger) | Optional | P2 |

P0 items are the minimum viable demo. P1 items significantly increase judging scores. P2 items are impressive extras if time permits.

---

*Phase 12 complete. RainUSE Nexus is ready. Possibility in Every Drop.*
