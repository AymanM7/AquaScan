"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MapBackground } from "@/components/map/MapBackground";
import { RainParticleOverlay } from "@/components/map/RainParticleOverlay";
import { useBuildingStore } from "@/store/buildingStore";

const HEADLINE_LINE1 = "Every rooftop is a water reservoir.";
const HEADLINE_LINE2 = "Most companies don't know it yet.";

const STATE_GROUPS = [
  { label: "High Water Stress", states: ["TX", "AZ", "CA"] },
  { label: "Medium", states: ["PA", "GA", "FL"] },
  { label: "Standard", states: ["NY", "OH", "IL"] },
];

function LetterReveal({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span>
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + i * 0.04, duration: 0.02 }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

export default function LandingPage() {
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  const router = useRouter();
  const setSelectedState = useBuildingStore((s) => s.setSelectedState);
  const [state, setState] = useState("TX");
  const hasMapbox = useMemo(() => !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN, []);
  const [isOnboarded, setIsOnboarded] = useState(false);

  // Check if already onboarded
  useEffect(() => {
    if (typeof document !== "undefined") {
      const done = document.cookie.split(";").some((c) => c.trim().startsWith("rainuse_onboarding=1"));
      setIsOnboarded(done);
    }
  }, []);

  const enterMap = () => {
    setSelectedState(state);
    if (isOnboarded) {
      router.push("/map");
    } else {
      // Send to onboarding first, which will redirect to /map after completion
      router.push("/onboarding?next=/map");
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-primary text-content-primary">
      {/* Background layers */}
      <div className="absolute inset-0">
        {hasMapbox ? (
          <MapBackground />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#060D1A] via-[#0a1628] to-[#060D1A]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-bg-primary/30 via-bg-primary/60 to-bg-primary/90" />
        <RainParticleOverlay />
      </div>

      <div className="relative z-20 flex min-h-screen flex-col">
        {/* Auth header */}
        <header className="flex items-center justify-between px-6 pt-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent-teal/60"
          >
            RainUSE Nexus
          </motion.div>
          <div className="flex gap-3 text-sm">
            {!isAuthenticated ? (
              <>
                <button
                  type="button"
                  className="rounded-md border border-edge/50 px-3 py-1.5 text-xs text-content-secondary hover:border-edge-active hover:text-content-primary transition-colors"
                  onClick={() => loginWithRedirect()}
                >
                  Grundfos Rep Login
                </button>
                <button
                  type="button"
                  className="rounded-md bg-accent-teal/15 px-3 py-1.5 text-xs text-accent-teal hover:bg-accent-teal/25 transition-colors"
                  onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: "signup" } })}
                >
                  Judge Preview
                </button>
              </>
            ) : (
              <Link
                href="/map"
                className="rounded-md border border-accent-teal/30 px-3 py-1.5 text-xs text-accent-teal hover:bg-accent-teal/10 transition-colors"
              >
                Enter Mission Control →
              </Link>
            )}
          </div>
        </header>

        {/* Hero */}
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-2xl text-center">
            {/* Headline with letter-by-letter reveal */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-8"
            >
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-accent-teal">
                Autonomous Water Intelligence
              </p>
              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                <span className="italic text-content-primary/90">
                  <LetterReveal text={HEADLINE_LINE1} />
                </span>
                <br />
                <span className="text-content-secondary/70">
                  <LetterReveal text={HEADLINE_LINE2} delay={HEADLINE_LINE1.length * 0.04 + 0.3} />
                </span>
              </h1>
            </motion.div>

            {/* State selector card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5, type: "spring", stiffness: 200, damping: 30 }}
              className="mx-auto max-w-md rounded-2xl border border-edge/50 bg-bg-surface/50 p-6 backdrop-blur-xl"
            >
              <label className="block text-left text-xs text-content-secondary">
                Select priority state
                <select
                  className="mt-2 w-full rounded-lg border border-edge bg-bg-primary/80 px-3 py-2.5 text-sm text-content-primary"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  {STATE_GROUPS.map((g) => (
                    <optgroup key={g.label} label={`${g.label} Water Stress`}>
                      {g.states.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={enterMap}
                  className="flex-1 rounded-lg bg-accent-teal px-4 py-3 text-sm font-semibold text-bg-primary shadow-teal-glow transition-all hover:shadow-[0_0_30px_rgba(0,229,204,0.5)]"
                >
                  {isOnboarded ? "Enter Mission Map" : "Find Water Opportunities"}
                </button>
              </div>

              {!isOnboarded && (
                <div className="mt-3 flex justify-center gap-4 text-xs">
                  <Link href="/onboarding" className="text-content-secondary hover:text-accent-teal transition-colors">
                    Configure Territory
                  </Link>
                  <Link href="/compare" className="text-content-secondary hover:text-accent-teal transition-colors">
                    Compare States
                  </Link>
                </div>
              )}
              {isOnboarded && (
                <div className="mt-3 flex justify-center gap-4 text-xs">
                  <Link href="/map" className="text-content-secondary hover:text-accent-teal transition-colors">
                    Map Dashboard
                  </Link>
                  <Link href="/automation" className="text-content-secondary hover:text-accent-teal transition-colors">
                    Automation Center
                  </Link>
                  <Link href="/inbox" className="text-content-secondary hover:text-accent-teal transition-colors">
                    Inbox
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Bottom tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.5 }}
          className="pb-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-content-secondary/40"
        >
          Possibility in Every Drop · Grundfos Foundation Hackathon 2026
        </motion.div>
      </div>
    </main>
  );
}
