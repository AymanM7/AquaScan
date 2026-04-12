# PHASE 11 — Frontend Shell, Global Layout & ElevenLabs Debrief Widget
## Files: `app/layout.tsx`, `AppNav`, `ElevenLabsDebriefPlayer`, design system, global state

**Prerequisite:** All previous phases drafted. This phase wires the frontend together into a cohesive shell.

---

## 1. Objective

This phase is the connective tissue of the entire frontend. It covers:

1. **Global `app/layout.tsx`** — root shell, font loading, metadata, global widget mounts
2. **`AppNav`** — the persistent top navigation with route awareness, role gating, and the feed notification dot
3. **`ElevenLabsDebriefPlayer`** — the floating bottom-left audio widget that plays the login intelligence debrief
4. **Design system CSS** — the complete `globals.css` implementing the Phase 00 design tokens
5. **Global Zustand store bootstrap** — auth state, user settings, map selection state
6. **Middleware** — Auth0 route protection
7. **`next.config.js`** — environment variable exposure, image domains

Without this phase, all other pages lack consistent navigation, styling, and the signature ElevenLabs debrief experience.

---

## 2. `app/layout.tsx` — Root Layout

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Syne, IBM_Plex_Sans, Space_Mono } from 'next/font/google'
import { Auth0Provider } from '@auth0/auth0-react'
import { WaterWasteMeter } from '@/components/shared/WaterWasteMeter'
import { ElevenLabsDebriefPlayer } from '@/components/shared/ElevenLabsDebriefPlayer'
import './globals.css'

// Font declarations:
const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
  weight: ['400', '600', '700', '800'],
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-ibm-plex',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  title: 'RainUSE Nexus — Water Opportunity Intelligence Engine',
  description: 'Autonomous prospecting engine for Grundfos water reuse systems. '
    + 'Find, score, and close commercial water-reuse opportunities across the US.',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: 'RainUSE Nexus',
    description: 'Possibility in Every Drop — Grundfos',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${ibmPlexSans.variable} ${spaceMono.variable}`}>
      <body className="root-body">
        <Auth0Provider
          domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN!}
          clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!}
          authorizationParams={{
            redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
            audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
          }}
        >
          {children}
          
          {/* Global persistent widgets — mounted outside page routes */}
          <WaterWasteMeter />
          <ElevenLabsDebriefPlayer />
          
        </Auth0Provider>
      </body>
    </html>
  )
}
```

---

## 3. `globals.css` — Complete Design System

```css
/* app/globals.css */

/* ─── CSS Custom Properties ─── */
:root {
  /* Colors */
  --color-bg-primary:    #060D1A;
  --color-bg-surface:    #0D1B2E;
  --color-bg-surface-2:  #142236;
  --color-accent-teal:   #00E5CC;
  --color-accent-amber:  #F5A623;
  --color-accent-blue:   #60A5FA;
  --color-accent-green:  #4ADE80;
  --color-accent-purple: #A78BFA;
  --color-accent-coral:  #FB7185;
  --color-text-primary:  #E8F4F8;
  --color-text-secondary:#7A95B0;
  --color-text-mono:     #00E5CC;
  --color-border:        rgba(0, 229, 204, 0.15);
  --color-border-active: rgba(0, 229, 204, 0.60);

  /* Fonts */
  --font-heading: var(--font-syne), 'Syne', sans-serif;
  --font-body:    var(--font-ibm-plex), 'IBM Plex Sans', sans-serif;
  --font-mono:    var(--font-space-mono), 'Space Mono', monospace;

  /* Shadows */
  --shadow-card:    0 2px 12px rgba(0, 0, 0, 0.4);
  --shadow-teal:    0 0 20px rgba(0, 229, 204, 0.25);
  --shadow-amber:   0 0 20px rgba(245, 166, 35, 0.25);
  --shadow-panel:   0 8px 32px rgba(0, 0, 0, 0.5);
  
  /* Border radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 400ms ease;
}

/* ─── Reset & Base ─── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body, .root-body {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}

/* ─── Typography ─── */
h1, h2, h3, h4, h5 {
  font-family: var(--font-heading);
  color: var(--color-text-primary);
  line-height: 1.2;
  letter-spacing: -0.02em;
}

h1 { font-size: 2.5rem; font-weight: 800; }
h2 { font-size: 1.8rem; font-weight: 700; }
h3 { font-size: 1.3rem; font-weight: 600; }
h4 { font-size: 1.05rem; font-weight: 600; }

p  { color: var(--color-text-secondary); line-height: 1.7; }

code, .mono {
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--color-text-mono);
}

a {
  color: var(--color-accent-teal);
  text-decoration: none;
  transition: opacity var(--transition-fast);
}
a:hover { opacity: 0.8; }

/* ─── Scrollbar ─── */
::-webkit-scrollbar       { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--color-bg-primary); }
::-webkit-scrollbar-thumb { background: rgba(0,229,204,0.25); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(0,229,204,0.45); }

/* ─── Cards & Surfaces ─── */
.card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
}

.card-2 {
  background: var(--color-bg-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
}

/* ─── Buttons ─── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: var(--color-accent-teal);
  color: #060D1A;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: box-shadow var(--transition-base), transform var(--transition-fast);
}
.btn-primary:hover {
  box-shadow: 0 0 20px rgba(0, 229, 204, 0.5);
  transform: translateY(-1px);
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  background: transparent;
  color: var(--color-accent-teal);
  font-family: var(--font-mono);
  font-size: 13px;
  border: 1px solid var(--color-border-active);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast), box-shadow var(--transition-base);
}
.btn-outline:hover {
  background: rgba(0, 229, 204, 0.08);
  box-shadow: var(--shadow-teal);
}

.btn-ghost {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: 13px;
  cursor: pointer;
  transition: color var(--transition-fast);
}
.btn-ghost:hover { color: var(--color-text-primary); }

/* ─── Pills / Badges ─── */
.pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pill-teal   { background: rgba(0,229,204,0.12);   color: var(--color-accent-teal);   border: 1px solid rgba(0,229,204,0.3); }
.pill-amber  { background: rgba(245,166,35,0.12);  color: var(--color-accent-amber);  border: 1px solid rgba(245,166,35,0.3); }
.pill-green  { background: rgba(74,222,128,0.12);  color: var(--color-accent-green);  border: 1px solid rgba(74,222,128,0.3); }
.pill-coral  { background: rgba(251,113,133,0.12); color: var(--color-accent-coral);  border: 1px solid rgba(251,113,133,0.3); }
.pill-purple { background: rgba(167,139,250,0.12); color: var(--color-accent-purple); border: 1px solid rgba(167,139,250,0.3); }
.pill-blue   { background: rgba(96,165,250,0.12);  color: var(--color-accent-blue);   border: 1px solid rgba(96,165,250,0.3); }

/* ─── Section utilities ─── */
.section-label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--color-text-secondary);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 12px;
}

/* ─── Keyframe animations ─── */
@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(0, 229, 204, 0.4); }
  70%  { box-shadow: 0 0 0 16px rgba(0, 229, 204, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 229, 204, 0); }
}

@keyframes breathe {
  0%, 100% { transform: scale(1.0); opacity: 0.9; }
  50%       { transform: scale(1.04); opacity: 1.0; }
}

@keyframes blink-cursor {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

@keyframes ticker-scroll {
  from { transform: translateX(100vw); }
  to   { transform: translateX(-100%); }
}

@keyframes rain-fall {
  from { transform: translateY(-10px); opacity: 1; }
  to   { transform: translateY(100vh); opacity: 0; }
}

/* ─── Page base ─── */
.page-container {
  min-height: 100vh;
  background: var(--color-bg-primary);
}

.content-container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ─── Skeleton loaders ─── */
.skeleton {
  background: linear-gradient(90deg,
    var(--color-bg-surface) 25%,
    var(--color-bg-surface-2) 50%,
    var(--color-bg-surface) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

@keyframes shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}
```

---

## 4. `AppNav` — `components/shared/AppNav.tsx`

### 4.1 Visual Design

```
┌──────────────────────────────────────────────────────────────────────┐
│ [💧 RainUSE Nexus]  [Map] [Compare] [Portfolio] [Feed 🔴] [Inbox]   │
│                                          [user avatar] [logout]      │
└──────────────────────────────────────────────────────────────────────┘
```

Sticky. 60px tall. Dark surface. Teal left border on active route. Semi-transparent with backdrop blur on scroll.

### 4.2 Implementation

```tsx
'use client'
import { useAuth0 } from '@auth0/auth0-react'
import { usePathname, useRouter } from 'next/navigation'
import { useFeedStore } from '@/store/feedStore'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/map',        label: 'Map',        icon: '🗺️',  roles: ['*'] },
  { href: '/compare',    label: 'Compare',    icon: '⚔️',  roles: ['*'] },
  { href: '/portfolio',  label: 'Portfolio',  icon: '🏢',  roles: ['*'] },
  { href: '/feed',       label: 'Feed',       icon: '📡',  roles: ['*'], hasDot: true },
  { href: '/inbox',      label: 'Inbox',      icon: '📥',  roles: ['grundfos_rep', 'grundfos_manager', 'demo_judge'] },
  { href: '/automation', label: 'Engine',     icon: '⚙️',  roles: ['*'] },
]

export function AppNav() {
  const { user, logout, isAuthenticated } = useAuth0()
  const pathname = usePathname()
  const router = useRouter()
  const feedHasNew = useFeedStore(s => s.feedHasNew)
  
  const userRoles: string[] = user?.['https://rainuse.io/roles'] ?? []
  
  const canSeeItem = (roles: string[]) =>
    roles.includes('*') || roles.some(r => userRoles.includes(r))
  
  const isActive = (href: string) => pathname?.startsWith(href)
  
  return (
    <nav className="app-nav">
      
      {/* Logo */}
      <Link href="/" className="nav-logo">
        <span className="nav-logo-drop">💧</span>
        <span className="nav-logo-text">RainUSE Nexus</span>
      </Link>
      
      {/* Nav items */}
      <div className="nav-items">
        {NAV_ITEMS.filter(item => canSeeItem(item.roles)).map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive(item.href) ? 'nav-item--active' : ''}`}
          >
            <span className="nav-item-label">{item.label}</span>
            {item.hasDot && feedHasNew && (
              <span className="nav-notification-dot" aria-label="New feed items" />
            )}
          </Link>
        ))}
      </div>
      
      {/* Right side: user + logout */}
      <div className="nav-right">
        {isAuthenticated && user && (
          <>
            <div className="nav-user">
              {user.picture
                ? <img src={user.picture} alt="" className="nav-avatar" />
                : <div className="nav-avatar-initials">{user.name?.[0]}</div>
              }
              <span className="nav-user-name">{user.given_name ?? user.name}</span>
            </div>
            <button
              className="nav-logout-btn"
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            >
              Sign Out
            </button>
          </>
        )}
      </div>
      
    </nav>
  )
}
```

### 4.3 Nav CSS

```css
.app-nav {
  position: sticky;
  top: 0;
  z-index: 1000;
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: rgba(6, 13, 26, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  gap: 8px;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 32px;
  text-decoration: none;
}
.nav-logo-drop { font-size: 20px; }
.nav-logo-text {
  font-family: var(--font-heading);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.nav-items {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color var(--transition-fast), background var(--transition-fast);
}
.nav-item:hover {
  color: var(--color-text-primary);
  background: rgba(0, 229, 204, 0.06);
}
.nav-item--active {
  color: var(--color-accent-teal);
  background: rgba(0, 229, 204, 0.08);
}
.nav-item--active::after {
  content: '';
  position: absolute;
  bottom: -1px;  /* sits on the nav border-bottom */
  left: 8px;
  right: 8px;
  height: 2px;
  background: var(--color-accent-teal);
  border-radius: 2px 2px 0 0;
}

.nav-notification-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background: var(--color-accent-coral);
  border-radius: 50%;
  border: 1.5px solid var(--color-bg-primary);
  animation: pulse-ring 2s infinite;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}
.nav-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--color-border-active);
}
.nav-avatar-initials {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0,229,204,0.15);
  border: 2px solid var(--color-border-active);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--color-accent-teal);
}
.nav-user-name {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.nav-logout-btn {
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}
.nav-logout-btn:hover {
  color: var(--color-accent-coral);
  border-color: var(--color-accent-coral);
}
```

---

## 5. ElevenLabs Debrief Player — `components/shared/ElevenLabsDebriefPlayer.tsx`

### 5.1 Concept

Every login triggers a personalized voice intelligence debrief. The player floats in the **bottom-left corner** of every page. It begins playing softly as the page loads. It shows a scrolling transcript line by line. The user can pause, replay, or dismiss.

This is the feature judges will remember. The system speaks to the user before the user touches anything.

### 5.2 Trigger Logic

```tsx
// When user authenticates via Auth0:
// 1. Check if a debrief was already generated today for this user_id
//    GET /api/debrief/{user_id} → { script_text, elevenlabs_audio_url, generated_at }
// 2. If generated_at < today (or null):
//    POST /api/debrief/generate → triggers backend to:
//      a. Pull territory data (top prospects, score changes, alerts)
//      b. Generate script via Claude
//      c. Call ElevenLabs API → audio URL stored in login_debriefs table
//    Returns: { script_text, elevenlabs_audio_url }
// 3. Begin autoplay after 3-second delay (user lands on page, then hears it)
```

### 5.3 Component

```tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DebriefData {
  script_text: string
  elevenlabs_audio_url: string
  generated_at: string
}

export function ElevenLabsDebriefPlayer() {
  const { isAuthenticated, user } = useAuth0()
  const [debrief, setDebrief] = useState<DebriefData | null>(null)
  const [playing, setPlaying] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [currentLine, setCurrentLine] = useState(0)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Fetch / generate debrief on auth
  useEffect(() => {
    if (!isAuthenticated || !user?.sub) return
    
    const userId = user.sub
    fetchOrGenerateDebrief(userId).then(data => {
      setDebrief(data)
      // Auto-start after 3 second delay
      setTimeout(() => setPlaying(true), 3000)
    })
  }, [isAuthenticated, user])
  
  // Handle audio play/pause
  useEffect(() => {
    if (!debrief?.elevenlabs_audio_url) return
    
    if (!audioRef.current) {
      audioRef.current = new Audio(debrief.elevenlabs_audio_url)
      audioRef.current.volume = 0.7
      audioRef.current.onended = () => setPlaying(false)
      audioRef.current.ontimeupdate = () => {
        if (!audioRef.current) return
        const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100
        setProgress(pct)
        // Advance transcript lines proportionally
        const lines = debrief.script_text.split('. ')
        setCurrentLine(Math.floor((pct / 100) * lines.length))
      }
    }
    
    if (playing) {
      audioRef.current.play().catch(() => {
        // Autoplay blocked — show "Play" prompt
        setPlaying(false)
      })
    } else {
      audioRef.current.pause()
    }
  }, [playing, debrief])
  
  if (!debrief || dismissed) return null
  
  const lines = debrief.script_text.split('. ').filter(Boolean)
  
  return (
    <AnimatePresence>
      <motion.div
        className="debrief-player"
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -300, opacity: 0 }}
        transition={{ delay: 2.8, type: 'spring', stiffness: 80, damping: 18 }}
      >
        
        {minimized ? (
          <div className="debrief-pill" onClick={() => setMinimized(false)}>
            <WaveformIcon playing={playing} />
            <span>Intelligence Debrief</span>
          </div>
        ) : (
          <div className="debrief-full">
            
            <div className="debrief-header">
              <div className="debrief-header-left">
                <WaveformIcon playing={playing} />
                <span className="debrief-title">Intelligence Debrief</span>
              </div>
              <div className="debrief-header-controls">
                <button onClick={() => setMinimized(true)}>—</button>
                <button onClick={() => setDismissed(true)}>✕</button>
              </div>
            </div>
            
            {/* Transcript scrolling display */}
            <div className="debrief-transcript">
              {lines.map((line, i) => (
                <span
                  key={i}
                  className={`transcript-line ${
                    i === currentLine ? 'active' : i < currentLine ? 'past' : 'future'
                  }`}
                >
                  {line}.{' '}
                </span>
              ))}
            </div>
            
            {/* Progress bar */}
            <div className="debrief-progress-bar">
              <div className="debrief-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            
            {/* Controls */}
            <div className="debrief-controls">
              <button
                className="debrief-play-btn"
                onClick={() => setPlaying(p => !p)}
              >
                {playing ? '⏸' : '▶'} {playing ? 'Pause' : 'Play'}
              </button>
              <button
                className="debrief-replay-btn"
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = 0
                    setCurrentLine(0)
                    setPlaying(true)
                  }
                }}
              >
                ↺ Replay
              </button>
              <span className="debrief-powered-by">via ElevenLabs</span>
            </div>
            
          </div>
        )}
        
      </motion.div>
    </AnimatePresence>
  )
}
```

### 5.4 Waveform Visualizer

```tsx
// Animated SVG waveform bars while audio plays
function WaveformIcon({ playing }: { playing: boolean }) {
  return (
    <svg className="waveform-icon" width="24" height="16" viewBox="0 0 24 16">
      {[2, 6, 10, 14, 18, 22].map((x, i) => (
        <rect
          key={i}
          x={x}
          y={playing ? 0 : 4}
          width={2}
          height={playing ? 16 : 8}
          fill="var(--color-accent-teal)"
          rx={1}
          style={{
            animation: playing ? `waveform-bar ${0.4 + i * 0.07}s ease-in-out infinite alternate` : 'none',
            transformOrigin: 'center bottom',
          }}
        />
      ))}
    </svg>
  )
}

// CSS:
// @keyframes waveform-bar {
//   from { transform: scaleY(0.3); }
//   to   { transform: scaleY(1.0); }
// }
```

### 5.5 Debrief CSS

```css
.debrief-player {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 900;
  width: 300px;
}

.debrief-full {
  background: var(--color-bg-surface);
  border: 1px solid rgba(0, 229, 204, 0.2);
  border-left: 3px solid var(--color-accent-teal);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-panel), 0 0 24px rgba(0, 229, 204, 0.08);
}

.debrief-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.debrief-title {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-accent-teal);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-left: 8px;
}

.debrief-transcript {
  font-family: var(--font-body);
  font-size: 12px;
  line-height: 1.7;
  max-height: 90px;
  overflow: hidden;
  margin-bottom: 10px;
}

.transcript-line.active  { color: var(--color-text-primary); font-weight: 500; }
.transcript-line.past    { color: rgba(122, 149, 176, 0.4); }
.transcript-line.future  { color: rgba(122, 149, 176, 0.7); }

.debrief-progress-bar {
  height: 2px;
  background: rgba(0, 229, 204, 0.15);
  border-radius: 2px;
  margin-bottom: 10px;
}
.debrief-progress-fill {
  height: 100%;
  background: var(--color-accent-teal);
  border-radius: 2px;
  transition: width 0.5s linear;
}

.debrief-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.debrief-play-btn {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-accent-teal);
  background: rgba(0, 229, 204, 0.1);
  border: 1px solid rgba(0, 229, 204, 0.3);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  cursor: pointer;
}
.debrief-replay-btn {
  font-size: 11px;
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
}
.debrief-powered-by {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 9px;
  color: rgba(122, 149, 176, 0.5);
  letter-spacing: 0.05em;
}

.debrief-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg-surface);
  border: 1px solid rgba(0, 229, 204, 0.2);
  border-radius: 24px;
  padding: 8px 14px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-accent-teal);
}
```

### 5.6 Backend — Debrief Generation

```python
# routers/settings.py (or a dedicated routers/debrief.py)

@router.get("/debrief/{user_id}")
async def get_debrief(user_id: str, db: AsyncSession = Depends(get_db)):
    """Return the most recent debrief for this user, or null if none today"""
    today = date.today()
    result = await db.execute(
        select(LoginDebrief)
        .where(LoginDebrief.user_id == user_id)
        .where(LoginDebrief.generated_at >= datetime.combine(today, time.min))
        .order_by(LoginDebrief.generated_at.desc())
        .limit(1)
    )
    debrief = result.scalar_one_or_none()
    if not debrief:
        return None
    return { "script_text": debrief.script_text, "elevenlabs_audio_url": debrief.elevenlabs_audio_url }

@router.post("/debrief/generate")
async def generate_debrief(body: GenerateDebriefRequest, db: AsyncSession = Depends(get_db)):
    """
    1. Pull territory data for this user
    2. Call Claude to generate 130-word script
    3. Call ElevenLabs TTS to generate audio
    4. Store in login_debriefs
    5. Return script + audio URL
    """
    # Step 1: Gather context
    user_settings = await get_user_settings(body.user_id, db)
    top_buildings = await get_top_buildings(state=user_settings.territory, limit=3, db=db)
    recent_alerts = await get_recent_alerts(state=user_settings.territory, limit=3, db=db)
    recent_runs = await get_recent_runs(user_id=body.user_id, limit=1, db=db)
    
    # Step 2: Generate script via Claude
    import anthropic
    client = anthropic.Anthropic()
    
    context = f"""
    Territory: {user_settings.territory}
    Top 3 Buildings: {[b.name + ' (Score: ' + str(b.final_score) + ')' for b in top_buildings]}
    Recent Alerts: {[a.headline for a in recent_alerts]}
    Last Automation Run: {recent_runs[0].run_at if recent_runs else 'No runs yet'}
    New Threshold Crossings: {recent_runs[0].crossings_count if recent_runs else 0}
    """
    
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        system="""You are the RainUSE Nexus intelligence engine delivering a personalized morning briefing 
        to a Grundfos water solutions sales rep. Write a 120–140 word spoken debrief script in a warm, 
        professional tone — confident but not robotic. Cover: what the territory looks like today, 
        the top building to watch, any notable score changes or alerts, and what the automation engine 
        did overnight. Use specific numbers. End with a brief motivating line. Do not use bullet points — 
        this is spoken prose.""",
        messages=[{ "role": "user", "content": f"Generate today's debrief using this data:\n{context}" }]
    )
    
    script_text = message.content[0].text
    
    # Step 3: ElevenLabs TTS
    import httpx
    el_response = await httpx.AsyncClient().post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}",
        headers={
            "xi-api-key": settings.ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "text": script_text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": { "stability": 0.5, "similarity_boost": 0.75 }
        }
    )
    
    # Step 4: Save audio to S3-compatible storage, get URL
    audio_url = await upload_audio(el_response.content, user_id=body.user_id)
    
    # Step 5: Store in DB
    debrief = LoginDebrief(
        user_id=body.user_id,
        generated_at=datetime.utcnow(),
        script_text=script_text,
        elevenlabs_audio_url=audio_url
    )
    db.add(debrief)
    await db.commit()
    
    return { "script_text": script_text, "elevenlabs_audio_url": audio_url }
```

**For hackathon demo fallback:** If ElevenLabs API is unavailable or slow, fall back to `window.speechSynthesis.speak()` using the returned `script_text`. This ensures the debrief always plays.

```tsx
// In ElevenLabsDebriefPlayer.tsx:
// If audio URL returns 404 or fails to load:
const handleAudioError = () => {
  if (debrief?.script_text) {
    const utterance = new SpeechSynthesisUtterance(debrief.script_text)
    utterance.rate = 0.95
    utterance.pitch = 1.0
    window.speechSynthesis.speak(utterance)
  }
}
```

---

## 6. Auth0 Middleware — `middleware.ts`

```typescript
// middleware.ts (Next.js App Router)
import { NextRequest, NextResponse } from 'next/server'

// Protected routes and their required roles:
const PROTECTED_ROUTES: Record<string, string[]> = {
  '/inbox':      ['grundfos_rep', 'grundfos_manager', 'demo_judge'],
  '/dealroom':   ['grundfos_rep', 'grundfos_manager', 'partner_view', 'demo_judge'],
  '/automation': ['grundfos_rep', 'grundfos_manager'],
  '/report':     ['grundfos_rep', 'grundfos_manager', 'demo_judge'],
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if route requires protection
  const requiredRoles = Object.entries(PROTECTED_ROUTES).find(
    ([route]) => pathname.startsWith(route)
  )?.[1]
  
  if (!requiredRoles) return NextResponse.next()
  
  // Auth0 session cookie check (simplified — use Auth0 SDK properly in production)
  // For hackathon: rely on client-side Auth0 useAuth0() role check in each page
  // Middleware redirects to /api/auth/login if no session cookie
  const session = request.cookies.get('appSession')
  if (!session) {
    return NextResponse.redirect(new URL(`/api/auth/login?returnTo=${pathname}`, request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/inbox/:path*', '/dealroom/:path*', '/automation/:path*', '/report/:path*'],
}
```

---

## 7. Global Zustand Store — `store/index.ts`

```tsx
// store/appStore.ts — global UI state
import { create } from 'zustand'

interface AppStore {
  // Auth
  userRoles: string[]
  userTerritory: string
  userThreshold: number
  setUserContext: (roles: string[], territory: string, threshold: number) => void
  
  // Map selection (shared across pages)
  selectedBuildingId: string | null
  highlightedBuildingIds: string[]
  setSelectedBuilding: (id: string | null) => void
  setHighlightedBuildings: (ids: string[]) => void
  
  // Debrief
  debriefPlaying: boolean
  setDebriefPlaying: (v: boolean) => void
}

export const useAppStore = create<AppStore>((set) => ({
  userRoles: [],
  userTerritory: 'TX',
  userThreshold: 80,
  setUserContext: (roles, territory, threshold) =>
    set({ userRoles: roles, userTerritory: territory, userThreshold: threshold }),
  
  selectedBuildingId: null,
  highlightedBuildingIds: [],
  setSelectedBuilding: (id) => set({ selectedBuildingId: id }),
  setHighlightedBuildings: (ids) => set({ highlightedBuildingIds: ids }),
  
  debriefPlaying: false,
  setDebriefPlaying: (v) => set({ debriefPlaying: v }),
}))
```

---

## 8. `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Expose public env vars
  env: {
    NEXT_PUBLIC_MAPBOX_TOKEN:      process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    NEXT_PUBLIC_AUTH0_DOMAIN:      process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    NEXT_PUBLIC_AUTH0_CLIENT_ID:   process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    NEXT_PUBLIC_AUTH0_AUDIENCE:    process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
    NEXT_PUBLIC_API_URL:           process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  
  images: {
    domains: [
      's3.amazonaws.com',
      'storage.googleapis.com',
      'cdn.auth0.com',     // Auth0 user avatars
      'lh3.googleusercontent.com',  // Google OAuth avatars
    ],
  },
  
  // For Mapbox peer dep issues
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      './utils/transform-request': false,
    }
    return config
  },
}

module.exports = nextConfig
```

---

## 9. `.env.local` Template

```bash
# Database
DATABASE_URL=postgresql+asyncpg://rainuse:rainuse_dev@localhost:5432/rainuse

# Redis
REDIS_URL=redis://localhost:6379

# Auth0
NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your_client_id
NEXT_PUBLIC_AUTH0_AUDIENCE=https://rainuse-api
AUTH0_SECRET=your_auth0_management_api_secret
AUTH0_CLIENT_SECRET=your_auth0_client_secret

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...

# AI APIs
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
PERPLEXITY_API_KEY=pplx-...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM   # Rachel voice

# Storage
S3_BUCKET=rainuse-assets
S3_REGION=us-east-1
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_ENDPOINT=...  # or leave blank for AWS
```

---

## 10. Phase 11 Checklist

- [ ] Google Fonts (Syne, IBM Plex Sans, Space Mono) load with no FOUT
- [ ] All CSS custom properties defined in globals.css
- [ ] AppNav renders on all pages except `/onboarding` and landing `/`
- [ ] Active nav item shows teal bottom border
- [ ] Feed notification dot appears on `/feed` nav item when feedHasNew = true
- [ ] Dot clears when user visits /feed
- [ ] Auth0 user avatar shows in nav when logged in
- [ ] Logout button works
- [ ] Role-gated nav items (Inbox) hidden for users without correct roles
- [ ] ElevenLabsDebriefPlayer mounts globally via layout.tsx
- [ ] Debrief auto-plays 3 seconds after login with audio
- [ ] Transcript lines advance in sync with audio progress
- [ ] Transcript active line is bright white, past lines fade
- [ ] Pause/Play button works
- [ ] Replay restarts audio and transcript from beginning
- [ ] Minimize collapses to pill (retains playing state)
- [ ] Dismiss removes widget entirely for session
- [ ] Fallback to speechSynthesis if ElevenLabs audio fails
- [ ] WaterWasteMeter appears bottom-right, does not overlap debrief player
- [ ] Both widgets coexist without z-index conflict
- [ ] Zustand appStore initialized on auth
- [ ] middleware.ts blocks /inbox, /dealroom, /report without session
- [ ] next.config.js exposes all required env vars
- [ ] No console errors on cold load
- [ ] Mobile nav: collapses to hamburger at <768px (optional for hackathon, noted)
