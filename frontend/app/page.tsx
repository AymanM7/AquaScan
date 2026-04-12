"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { MapBackground } from "@/components/map/MapBackground";
import { RainParticleOverlay } from "@/components/map/RainParticleOverlay";
import { ElevenLabsDebriefPlayer } from "@/components/shared/ElevenLabsDebriefPlayer";
import { WaterMeterWidget } from "@/components/shared/WaterMeterWidget";
import { useBuildingStore } from "@/store/buildingStore";

const STATES = ["TX", "AZ", "PA", "CA"];

export default function LandingPage() {
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  const router = useRouter();
  const setSelectedState = useBuildingStore((s) => s.setSelectedState);
  const [state, setState] = useState("TX");
  const hasMapbox = useMemo(() => !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN, []);

  const enterMap = () => {
    setSelectedState(state);
    router.push("/map");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-primary text-content-primary">
      <div className="absolute inset-0">
        {hasMapbox ? (
          <MapBackground />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-bg-surface via-bg-primary to-bg-surface-2" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-bg-primary/40 via-bg-primary/70 to-bg-primary" />
        <RainParticleOverlay />
      </div>

      <div className="relative z-20 flex min-h-screen flex-col">
        <header className="flex justify-end gap-3 px-6 pt-6 text-sm">
          {!isAuthenticated && (
            <>
              <button
                type="button"
                className="rounded-md border border-edge px-3 py-1.5 text-content-secondary hover:border-edge-active hover:text-content-primary"
                onClick={() => loginWithRedirect()}
              >
                Log in
              </button>
              <button
                type="button"
                className="rounded-md bg-accent-teal px-3 py-1.5 font-semibold text-bg-primary"
                onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: "signup" } })}
              >
                Sign up
              </button>
            </>
          )}
          {isAuthenticated && (
            <Link
              href="/map"
              className="rounded-md border border-edge-active px-3 py-1.5 text-accent-teal hover:bg-bg-surface/60"
            >
              Mission map
            </Link>
          )}
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="w-full max-w-xl rounded-2xl border border-edge bg-bg-surface/70 p-8 text-center shadow-teal-glow backdrop-blur-xl"
          >
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-accent-teal">
              Autonomous water intelligence
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Harvest the sky before the bill arrives.
            </h1>
            <p className="mt-4 text-sm text-content-secondary md:text-base">
              RainUSE Nexus scores every roof, every tariff, every mandate — then moves when the math
              crosses your line in the sand.
            </p>

            <div className="mt-8 flex flex-col items-stretch gap-3 md:flex-row md:justify-center">
              <label className="flex flex-1 flex-col text-left text-xs text-content-secondary">
                Priority state
                <select
                  className="mt-1 rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-content-primary"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-1 flex-col justify-end gap-2 md:flex-row">
                <button
                  type="button"
                  onClick={enterMap}
                  className="flex-1 rounded-lg bg-accent-teal px-4 py-3 text-sm font-semibold text-bg-primary shadow-teal-glow"
                >
                  Enter mission map
                </button>
                <Link
                  href="/onboarding"
                  className="flex flex-1 items-center justify-center rounded-lg border border-edge px-4 py-3 text-sm font-medium text-content-primary hover:border-edge-active"
                >
                  Configure territory
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <WaterMeterWidget />
      <ElevenLabsDebriefPlayer />
    </main>
  );
}
