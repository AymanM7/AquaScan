"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DEMO_MODE } from "@/lib/demoMode";
import { useBuildingStore } from "@/store/buildingStore";

function formatGal(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(3)}`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return Math.round(n).toLocaleString();
}

const POOL_GALLONS = 660_000;

export function WaterWasteMeter() {
  const base = DEMO_MODE ? 8_247_193_041 : 6_100_000_000;
  const [gallons, setGallons] = useState(base);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();
  const setFilter = useBuildingStore((s) => s.setFilter);

  useEffect(() => {
    // Annual waste / seconds per year => gallons per 50ms tick
    const annualWaste = 14_600_000_000_000; // ~14.6T gallons/yr US unoptimized
    const perTick = annualWaste / (365.25 * 24 * 3600 * 20); // every 50ms
    const id = setInterval(() => setGallons((g) => g + perTick), 50);
    return () => clearInterval(id);
  }, []);

  if (dismissed) return null;

  const pools = Math.floor(gallons / POOL_GALLONS);

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-[60] max-w-xs select-none rounded-xl border border-edge bg-bg-surface/95 px-4 py-3 text-left shadow-teal-glow backdrop-blur">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 text-content-secondary/40 hover:text-content-secondary text-xs"
        aria-label="Dismiss"
      >
        ✕
      </button>
      <p className="font-mono text-[10px] uppercase tracking-widest text-accent-coral">
        Water Being Wasted Right Now
      </p>
      <p className="mt-0.5 font-mono text-xl font-bold tabular-nums text-content-primary">
        💧 {formatGal(gallons)} gallons
      </p>
      <p className="mt-1 text-xs text-content-secondary">
        = {pools.toLocaleString()} Olympic swimming pools this year
      </p>
      <button
        type="button"
        onClick={() => {
          setFilter("minScore", 80);
          router.push("/map");
        }}
        className="mt-2 w-full rounded-md bg-accent-teal/20 px-3 py-1.5 text-xs font-semibold text-accent-teal hover:bg-accent-teal/30 transition-colors"
      >
        Reclaim It →
      </button>
    </div>
  );
}
