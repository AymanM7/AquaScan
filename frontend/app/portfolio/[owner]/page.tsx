"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import useSWR from "swr";

import { AppNav } from "@/components/shared/AppNav";
import { swrFetcher } from "@/lib/api";
import type { BuildingSummary } from "@/types/building";

type PortfolioView = {
  owner_name: string;
  corporate_parent: string;
  ticker: string;
  building_count: number;
  combined_roof_sqft: number;
  combined_annual_gallons: number;
  combined_potential_savings_usd: number;
  first_domino_building_id: string;
  first_domino_narrative: string;
  buildings: BuildingSummary[];
};

export default function PortfolioPage() {
  const params = useParams<{ owner: string }>();
  const raw = params?.owner ?? "";
  const ownerKey = decodeURIComponent(raw);
  const key = ownerKey ? `/api/portfolio/${encodeURIComponent(ownerKey)}` : null;
  const { data, error, isLoading } = useSWR<PortfolioView>(key, swrFetcher);

  return (
    <div className="min-h-screen bg-bg-primary">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {isLoading ? <p className="text-content-secondary">Loading portfolio…</p> : null}
        {error || (!isLoading && !data) ? (
          <p className="text-accent-coral">Portfolio not found for “{ownerKey}”.</p>
        ) : null}
        {data ? (
          <>
            <header className="mb-10 border-b border-edge pb-8">
              <p className="font-mono text-[10px] uppercase tracking-widest text-accent-teal">Portfolio</p>
              <h1 className="font-display text-4xl text-content-primary">{data.owner_name}</h1>
              <p className="mt-2 text-sm text-content-secondary">
                {data.corporate_parent}
                {data.ticker ? ` · ${data.ticker}` : ""}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Stat label="Buildings" value={String(data.building_count)} />
                <Stat label="Combined roof" value={`${(data.combined_roof_sqft / 1e3).toFixed(0)}k sqft`} />
                <Stat
                  label="Combined capture"
                  value={`${(data.combined_annual_gallons / 1e6).toFixed(1)}M gal/yr`}
                />
              </div>
            </header>

            <section className="mb-12 rounded-xl border border-edge-active bg-bg-surface-2 p-8">
              <h2 className="font-display text-2xl text-accent-amber">First domino</h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-content-secondary">
                {data.first_domino_narrative}
              </p>
              <Link
                href={`/building/${data.first_domino_building_id}`}
                className="mt-4 inline-block text-sm font-semibold text-accent-teal hover:underline"
              >
                Open anchor building →
              </Link>
            </section>

            <section className="mb-10">
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-content-secondary">
                Constellation map
              </h2>
              <div className="relative mt-6 flex h-64 items-center justify-center rounded-xl border border-edge bg-bg-surface overflow-hidden">
                {/* Arc lines connecting buildings to anchor */}
                <svg className="absolute inset-0 h-full w-full pointer-events-none">
                  {data.buildings.slice(0, 12).map((b, i, arr) => {
                    const angle = (i / Math.max(arr.length, 1)) * Math.PI * 2 - Math.PI / 2;
                    const r = 90;
                    const x = 50 + Math.cos(angle) * (r / 2.8);
                    const y = 50 + Math.sin(angle) * (r / 2.8);
                    return (
                      <line key={b.id} x1="50%" y1="50%" x2={`${x}%`} y2={`${y}%`}
                        stroke={b.id === data.first_domino_building_id ? "#F5A623" : "rgba(0,229,204,0.15)"}
                        strokeWidth={b.id === data.first_domino_building_id ? 2 : 1}
                        strokeDasharray={b.id === data.first_domino_building_id ? "" : "4 4"}
                      />
                    );
                  })}
                </svg>
                {data.buildings.slice(0, 12).map((b, i, arr) => {
                  const angle = (i / Math.max(arr.length, 1)) * Math.PI * 2 - Math.PI / 2;
                  const r = 90;
                  const x = Math.cos(angle) * r;
                  const y = Math.sin(angle) * r;
                  return (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.06 }}
                      className="absolute"
                      style={{ transform: `translate(${x}px, ${y}px)` }}
                    >
                      <Link
                        href={`/building/${b.id}`}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border text-[10px] font-mono ${
                          b.id === data.first_domino_building_id
                            ? "border-accent-amber bg-accent-amber/20 text-accent-amber"
                            : "border-edge bg-bg-surface-2 text-accent-teal"
                        }`}
                        title={b.name}
                      >
                        {b.final_score.toFixed(0)}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-content-secondary">
                All assets
              </h2>
              <ul className="mt-4 divide-y divide-edge border border-edge rounded-xl bg-bg-surface-2">
                {data.buildings.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div>
                      <Link href={`/building/${b.id}`} className="font-medium text-content-primary hover:underline">
                        {b.name}
                      </Link>
                      <p className="text-xs text-content-secondary">
                        {b.city}, {b.state} · {b.roof_sqft.toLocaleString()} sqft
                      </p>
                    </div>
                    <span className="font-mono text-sm text-accent-teal">{b.final_score.toFixed(0)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-edge bg-bg-surface-2 px-4 py-3">
      <p className="font-mono text-[10px] uppercase text-content-secondary">{label}</p>
      <p className="font-display text-xl text-content-primary">{value}</p>
    </div>
  );
}
