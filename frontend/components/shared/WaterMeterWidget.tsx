"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const ANNUAL_WASTE_GALLONS = 110_000_000;
const MS_PER_YEAR = 365 * 24 * 3600 * 1000;
const gallonsPerMs = ANNUAL_WASTE_GALLONS / MS_PER_YEAR;

export function WaterMeterWidget() {
  const [gallons, setGallons] = useState(0);

  const start = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
    const elapsed = now.getTime() - startOfYear;
    return elapsed * gallonsPerMs;
  }, []);

  useEffect(() => {
    setGallons(start);
    const id = window.setInterval(() => {
      setGallons((g) => g + gallonsPerMs * 50);
    }, 50);
    return () => clearInterval(id);
  }, [start]);

  const pools = gallons / 660_000;

  return (
    <div className="water-meter-widget fixed bottom-6 right-6 z-[100] max-w-[320px] rounded-xl border border-[rgba(0,229,204,0.3)] bg-[rgba(6,13,26,0.85)] p-4 text-sm text-content-primary shadow-teal-glow backdrop-blur">
      <div className="mb-2 text-xs text-content-secondary">
        Water being wasted right now in unoptimized TX buildings (modeled):
      </div>
      <span className="counter-value block font-mono text-2xl text-accent-teal">
        {Math.round(gallons).toLocaleString()} gal
      </span>
      <div className="mt-2 text-xs text-content-secondary">
        ≈ {pools.toFixed(2)} Olympic pools YTD (illustrative)
      </div>
      <Link
        href="/map"
        className="mt-3 inline-flex items-center justify-center rounded-md bg-accent-teal px-3 py-2 text-xs font-semibold text-bg-primary"
      >
        Reclaim it →
      </Link>
    </div>
  );
}
