"use client";

import { useEffect, useState } from "react";

import { DEMO_MODE } from "@/lib/demoMode";

function formatGal(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B gal`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M gal`;
  return `${Math.round(n).toLocaleString()} gal`;
}

export function WaterWasteMeter() {
  const base = DEMO_MODE ? 2_847_000_000 : 2_100_000_000;
  const [gallons, setGallons] = useState(base);

  useEffect(() => {
    const step = DEMO_MODE ? 48_000 : 14_000;
    const id = setInterval(() => setGallons((g) => g + step), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] max-w-xs select-none rounded-xl border border-edge bg-bg-surface/95 px-4 py-3 text-left shadow-teal-glow backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-widest text-accent-coral">
        Water not captured (US est.)
      </p>
      <p className="font-display text-xl font-bold text-content-primary">{formatGal(gallons)}</p>
      <p className="text-xs text-content-secondary">Live counter — opportunity left on roofs</p>
    </div>
  );
}
