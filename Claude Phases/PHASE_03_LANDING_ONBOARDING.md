# PHASE 03 — Landing Page & Onboarding Wizard
## Pages: `/` and `/onboarding`

**Prerequisite:** Design system from Phase 00 must be fully implemented in `globals.css` and `layout.tsx` before building any UI. Auth0 SDK must be configured.

---

## 1. Objective

Build two fully animated, cinematic pages that set the tone for the entire application:
- **`/` (Landing):** Satellite map background, animated rain, dramatic headline, state selector, Live Water Waste Meter, ElevenLabs debrief player
- **`/onboarding`:** Three-step wizard (territory → cadence → threshold), particle burst activation, Auth0 user metadata save

These pages are the first things judges see. They must be visually extraordinary.

---

## 2. Root Layout Setup — `app/layout.tsx`

```tsx
// app/layout.tsx
import { Syne, Space_Mono, IBM_Plex_Sans } from 'next/font/google'
import { Auth0Provider } from '@auth0/auth0-react'
import './globals.css'

const syne = Syne({ subsets: ['latin'], variable: '--font-syne', weight: ['400','600','700','800'] })
const spaceMono = Space_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400','700'] })
const ibmPlex = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-body', weight: ['300','400','500','600'] })

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${syne.variable} ${spaceMono.variable} ${ibmPlex.variable}`}>
      <body>
        <Auth0Provider
          domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN}
          clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}
          authorizationParams={{ redirect_uri: typeof window !== 'undefined' ? window.location.origin : '' }}
        >
          {children}
        </Auth0Provider>
      </body>
    </html>
  )
}
```

### `globals.css` — Design System Variables
All CSS variables from Phase 00 Section 3 must be declared here. Additionally:
```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { 
  background: var(--color-bg-primary); 
  color: var(--color-text-primary);
  font-family: var(--font-body), sans-serif;
}
h1, h2, h3 { font-family: var(--font-syne), sans-serif; }
.mono { font-family: var(--font-mono), monospace; }

/* Scrollbar styling */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--color-bg-surface); }
::-webkit-scrollbar-thumb { background: var(--color-accent-teal); border-radius: 3px; }
```

---

## 3. `middleware.ts` — Auth0 Route Protection

```typescript
// middleware.ts
import { withMiddlewareAuthRequired, getSession } from '@auth0/nextjs-auth0/edge'

export default withMiddlewareAuthRequired(async function middleware(req) {
  const res = NextResponse.next()
  const session = await getSession(req, res)
  
  // Redirect new users to onboarding
  const protectedRoutes = ['/map', '/building', '/compare', '/portfolio', '/dealroom', '/feed', '/automation', '/report', '/inbox']
  const isProtected = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route))
  
  if (isProtected && session?.user && !session.user['https://rainuse.io/onboarding_complete']) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }
  
  return res
})

export const config = {
  matcher: ['/map/:path*', '/building/:path*', '/dealroom/:path*', '/inbox/:path*', '/automation/:path*', '/report/:path*']
}
```

---

## 4. Landing Page — `app/page.tsx`

### Visual Concept
Full-viewport experience. No nav bar. No header. Just:
- Mapbox satellite map filling 100% viewport, slowly drifting
- HTML5 Canvas rain overlay (200 teal particles)
- Centered frosted-glass card with headline + state selector + CTA
- Fixed bottom-right: Live Water Waste Meter
- Fixed bottom-left: ElevenLabs Debrief Player (appears after Auth0 login resolves)
- Top-right: Two small login links

### Component Breakdown

#### `components/map/RainParticleOverlay.tsx`
Canvas element with `position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10`.

```typescript
// Rain physics
interface Particle {
  x: number;
  y: number;
  speed: number;       // 2–4 px/frame
  drift: number;       // -0.3 to +0.3 px/frame horizontal
  opacity: number;     // 0.4–0.8
  length: number;      // 6–12px
}

// Initialize 200 particles with random positions
// Each frame: y += speed, x += drift
// If y > canvas.height: reset to y = -10, random x
// Draw as: ctx.strokeStyle = `rgba(0, 229, 204, ${opacity})`
//          ctx.lineWidth = 1.5
//          ctx.moveTo(x, y); ctx.lineTo(x + drift*3, y + length)
```

Use `requestAnimationFrame` loop. Must NOT cause performance issues — keep canvas 2D, no WebGL needed.

#### `components/shared/WaterMeterWidget.tsx`
Fixed position widget, bottom-right. Shows:
- "💧 Water Being Wasted Right Now in Unoptimized TX Buildings:"
- A large counter in Space Mono font, ticking up every 50ms
- "= X Olympic swimming pools this year"
- "Reclaim It →" button (routes to /map with top-20 filter)

**Counter calculation:**
```typescript
// Total annual waste: 55 buildings × avg 2M gallons each unoptimized = 110M gallons/yr (conservative)
// Per 50ms tick: 110,000,000 / (365 * 24 * 3600 * 20) × 50ms ≈ 8.7 gallons per tick
const ANNUAL_WASTE_GALLONS = 110_000_000
const MS_PER_YEAR = 365 * 24 * 3600 * 1000
const gallonsPerMs = ANNUAL_WASTE_GALLONS / MS_PER_YEAR

// On mount: compute startGallons based on time of year elapsed
// Every 50ms: increment by gallonsPerMs * 50
// Display with toLocaleString() for comma formatting
```

Styling:
```css
.water-meter-widget {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: rgba(6, 13, 26, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 229, 204, 0.3);
  border-radius: 12px;
  padding: 16px 20px;
  z-index: 100;
  max-width: 320px;
}
.counter-value {
  font-family: var(--font-mono);
  font-size: 24px;
  color: var(--color-accent-teal);
  display: block;
}
```

#### `components/shared/ElevenLabsDebriefPlayer.tsx`
Fixed position, bottom-left. Appears with a soft fade-in after Auth0 login resolves AND `session.user` exists.

Fetches `GET /api/debrief/{user_id}` on mount. If `elevenlabs_audio_url` exists, creates an `<audio>` element and begins playing softly (volume 0.4) after a 1.5-second delay.

UI:
```
[🎙️ Intelligence Debrief]
"Good morning. Since your last session, two..."  ← scrolling transcript line-by-line
[▶ / ⏸] [✕]
```

Shows a CSS waveform animation (4 bars, different heights, animating up/down) while audio plays.

If no audio available yet (first login, audio generating): show "Generating your briefing..." with a subtle pulse.

#### Landing Page Layout — `app/page.tsx`

```tsx
export default function LandingPage() {
  const { user, loginWithRedirect } = useAuth0()
  const router = useRouter()
  
  // Mapbox map reference — slow drift animation
  useEffect(() => {
    const map = new mapboxgl.Map({
      container: 'bg-map',
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: [-98.5795, 39.8283],  // center of US
      zoom: 3.8,
      interactive: false,
      attributionControl: false
    })
    
    // Slow drift animation
    let frame = 0
    const drift = () => {
      frame++
      const lng = -98.5795 + (frame * 0.0003)  // very slow drift east
      map.setCenter([lng > -95 ? -102 : lng, 39.8])
      requestAnimationFrame(drift)
    }
    const raf = requestAnimationFrame(drift)
    return () => { cancelAnimationFrame(raf); map.remove() }
  }, [])
  
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Mapbox background */}
      <div id="bg-map" style={{ position: 'absolute', inset: 0 }} />
      
      {/* Dark overlay for readability */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,13,26,0.55)' }} />
      
      {/* Rain particles */}
      <RainParticleOverlay />
      
      {/* Centered hero card */}
      <motion.div 
        className="hero-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        {/* Headline with letter-by-letter reveal */}
        <AnimatedHeadline />
        
        {/* State selector */}
        <StateSelector onStateSelect={(state) => router.push(`/map?state=${state}`)} />
        
        {/* CTA Button */}
        <motion.button
          className="cta-button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/map')}
        >
          Find Water Opportunities
        </motion.button>
      </motion.div>
      
      {/* Auth links top-right */}
      <div className="auth-links">
        {!user ? (
          <>
            <button onClick={() => loginWithRedirect({ role: 'grundfos_rep' })}>
              Grundfos Rep Login
            </button>
            <button onClick={() => loginWithRedirect({ role: 'demo_judge' })}>
              Judge Preview
            </button>
          </>
        ) : (
          <span>Welcome, {user.name}</span>
        )}
      </div>
      
      {/* Fixed widgets */}
      <WaterMeterWidget />
      {user && <ElevenLabsDebriefPlayer userId={user.sub} />}
    </div>
  )
}
```

#### `AnimatedHeadline` Component
```tsx
const headline = [
  "Every rooftop is a water reservoir.",
  "Most companies don't know it yet."
]

// Framer Motion staggerChildren: split each line into individual characters
// Each char: initial opacity 0, animate opacity 1
// Stagger: 40ms per character
// Total animation: ~800ms
```

---

## 5. Onboarding Wizard — `app/onboarding/page.tsx`

### Concept
Three-step full-screen wizard. Background is the same satellite map + rain from the landing page, but with `filter: blur(4px)` behind elevated frosted-glass cards. Progress indicator at top.

### State Management
```typescript
interface OnboardingState {
  step: 1 | 2 | 3 | 'confirm'
  territory: 'DFW' | null
  cadence: 'daily' | 'weekly' | 'biweekly' | null
  threshold: number   // 0–100, default 75
}
```

### Step 1 — Territory Selection

**Component: `components/onboarding/TerritorySelector.tsx`**

Full-screen centered card, SVG map of the continental US.

The SVG map:
- Use a simplified continental US SVG path (d3-geo or a pre-drawn SVG)
- DFW marker: glowing teal circle at coordinates (~-97.03, 32.89), 12px radius, CSS `@keyframes` pulse animation (scale 1.0 → 1.3 → 1.0, 2s loop)
- DFW label: "Dallas / Fort Worth" in Syne 14px white
- Other cities (5–6 additional metros): dimmed gray circles (opacity 0.3), labeled "Coming Q3 2026" in Space Mono 10px
  - NYC, Chicago, LA, Phoenix, Seattle, Miami
- Clicking the DFW marker:
  1. `territory = 'DFW'`
  2. Circle intensifies: scale-up animation + color brightens to full `#00E5CC`
  3. After 600ms, advance to Step 2

**Copy:** "Select your intelligence territory. Your engine will scan this region on every automation run."

### Step 2 — Automation Cadence

**Component: `components/onboarding/CadenceSelector.tsx`**

Three large horizontal cards:

```
[🌅 Daily]           [📆 Weekly]          [🗓️ Bi-Weekly]
Best for active      Balanced cadence.    Lower volume.
territories.         Recommended for      Best combined with
Catches crossings    most sales teams.    a high threshold.
within 24 hours.
```

Card styling: dark navy `#0D1B2E`, `border: 1px solid var(--color-border)`, `border-radius: 12px`, padding `24px`.

Selected state: `border-color: var(--color-accent-teal)`, `box-shadow: 0 0 20px rgba(0,229,204,0.25)`, teal checkmark in corner.

After selection: small "You can change this anytime in Settings." note appears, then after 400ms, show a "Continue" button.

### Step 3 — Score Threshold

**Component: `components/onboarding/ThresholdSlider.tsx`**

A visually dominant full-width slider with a custom droplet-shaped thumb.

```tsx
// Radix UI Slider with custom styling
<Slider.Root
  min={0} max={100} step={1}
  value={[threshold]}
  onValueChange={([v]) => setThreshold(v)}
>
  <Slider.Track className="slider-track">
    <Slider.Range className="slider-range" />  {/* teal fill */}
  </Slider.Track>
  <Slider.Thumb className="slider-thumb">
    <DropletIcon />  {/* custom SVG droplet thumb */}
  </Slider.Thumb>
</Slider.Root>
```

Custom thumb styling:
```css
.slider-thumb {
  width: 28px;
  height: 36px;
  background: var(--color-accent-teal);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;  /* droplet shape */
  cursor: pointer;
  box-shadow: 0 0 16px rgba(0, 229, 204, 0.5);
  transform: rotate(180deg);
}
```

Three preset buttons above:
```
[Conservative: 90]    [Balanced: 75]    [Aggressive: 60]
```

Live preview below slider (updates instantly on drag):
```
At threshold [XX]: ~[N] buildings in DFW currently qualify
Estimated: [N-N] new reports per [cadence]
```

**Building count lookup table (hardcoded for hackathon):**
```typescript
const THRESHOLD_COUNTS = {
  90: { buildings: 8, reportsPerWeek: "1–2" },
  85: { buildings: 12, reportsPerWeek: "2–3" },
  80: { buildings: 18, reportsPerWeek: "3–5" },
  75: { buildings: 27, reportsPerWeek: "5–8" },
  70: { buildings: 38, reportsPerWeek: "8–12" },
  65: { buildings: 52, reportsPerWeek: "12–18" },
  60: { buildings: 71, reportsPerWeek: "18–25" },
  // interpolate for values between these
}
```

### Confirmation Screen

**Component: `components/onboarding/OnboardingConfirmation.tsx`**

Summary card showing:
```
Territory:  Dallas / Fort Worth
Cadence:    Weekly
Threshold:  75 — ~27 buildings qualify

[Activate Intelligence Engine]
```

**Button click sequence:**
1. Button text changes to "Initializing your automation engine..."
2. A `canvas-confetti` burst fires: `confetti({ colors: ['#00E5CC', '#F5A623', '#60A5FA'], particleCount: 80, spread: 120 })`
3. POST to `POST /api/settings/{user_id}` with the three settings
4. Celery Beat schedule initialized on backend
5. After 1.5s: navigate to `/`
6. Landing page loads — ElevenLabs debrief begins playing immediately

---

## 6. Progress Indicator Component

At the top of the onboarding screen, a three-step progress indicator:
```
● Territory  ——  ○ Cadence  ——  ○ Threshold
```

Use Framer Motion to animate the connecting lines filling in as steps complete.

---

## 7. State Selector Component — `components/map/StateSelector.tsx`

Radix UI `Select` with custom styling. The options are grouped into three water stress tiers:

```
High Water Stress: Arizona, California, Nevada, Utah, Colorado, New Mexico
Medium Stress:     Texas, Oklahoma, Kansas, Nebraska, Florida
Standard:          (all other states)
```

The currently available state is **Texas** (DFW). Selecting any other state shows a subtle "Coming Soon" toast for now, or can route to the map and show whatever data is in the DB.

Styled: frosted glass background, teal focus ring, search-filterable.

---

## 8. Navigation

After onboarding completes, the main navigation (visible on all pages except landing and onboarding) should appear as a fixed left sidebar on desktop or a bottom bar on mobile:

```
[💧 RainUSE Nexus logo]
[🗺️ Map] → /map
[🏢 Feed] → /feed
[⚙️ Automation] → /automation
[📬 Inbox] → /inbox (rep/manager only)
[⚔️ Compare] → /compare
[👤 Profile]
```

Nav is implemented as a separate `components/shared/AppNav.tsx` rendered in a layout wrapper for `/map`, `/building`, `/compare`, etc. NOT rendered on `/` or `/onboarding`.

---

## 9. Checklist Before Moving to Phase 04

- [ ] Fonts load correctly (Syne for headings, Space Mono for numbers, IBM Plex for body)
- [ ] All CSS variables are accessible throughout the app
- [ ] Rain particles render and fall continuously without blocking interactions
- [ ] Mapbox satellite map loads as landing background
- [ ] Letter-by-letter headline animation triggers on page load
- [ ] State selector shows Texas as active
- [ ] Water Waste Meter counter ticks up in real time
- [ ] Auth0 login/logout works with demo_judge role
- [ ] Onboarding three steps all render with correct animations
- [ ] Slider threshold preview updates instantly
- [ ] Particle burst fires on "Activate" click
- [ ] Settings POST to backend saves successfully
- [ ] New user → redirected to /onboarding (middleware)
- [ ] Returning user → /onboarding not shown again
- [ ] ElevenLabs player appears after login (even if audio URL is placeholder)
