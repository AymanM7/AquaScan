"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import useSWR from "swr";

import { AppNav } from "@/components/shared/AppNav";
import { apiJson, swrFetcher } from "@/lib/api";
import { aiCall } from "@/lib/aiCall";
import { DEMO_MODE } from "@/lib/demoMode";
import { MOCK_RESPONSES } from "@/lib/mockResponses";
import type { BuildingSummary } from "@/types/building";

type StateProfile = {
  state: string;
  total_buildings_over_100k: number;
  total_annual_opportunity_gallons: number;
  avg_viability_score: number;
  top_incentive_value_usd: number;
  avg_drought_score: number;
  top_5_buildings: BuildingSummary[];
  radar_scores: Record<string, number>;
};

type ComparePayload = Record<string, unknown> & {
  profiles: Record<string, StateProfile>;
  state_a: string;
  state_b: string;
};

const US_STATES = [
  "AL", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "ID", "IL", "IN", "IA", "KS", "KY", "LA",
  "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND",
  "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const NAMES: Record<string, string> = {
  TX: "Texas",
  PA: "Pennsylvania",
  CA: "California",
  FL: "Florida",
  NY: "New York",
  AZ: "Arizona",
};

const BATTLE = [
  { id: "volume", label: "Volume" },
  { id: "roi", label: "ROI" },
  { id: "regulation", label: "Regulation" },
  { id: "corporate", label: "Corporate" },
  { id: "resilience", label: "Climate" },
] as const;

function pickWinner(
  id: string,
  a: StateProfile,
  b: StateProfile,
): "a" | "b" | "tie" {
  let va: number;
  let vb: number;
  if (id === "regulation") {
    va = a.radar_scores.regulation ?? 0;
    vb = b.radar_scores.regulation ?? 0;
  } else if (id === "corporate") {
    va = a.radar_scores.corporate ?? 0;
    vb = b.radar_scores.corporate ?? 0;
  } else if (id === "volume") {
    va = a.total_annual_opportunity_gallons;
    vb = b.total_annual_opportunity_gallons;
  } else if (id === "roi") {
    va = a.avg_viability_score;
    vb = b.avg_viability_score;
  } else {
    va = a.avg_drought_score;
    vb = b.avg_drought_score;
  }
  if (Math.abs(va - vb) < 0.01) return "tie";
  return va > vb ? "a" : "b";
}

export default function ComparePage() {
  const [left, setLeft] = useState("TX");
  const [right, setRight] = useState("PA");
  const [verdict, setVerdict] = useState<string | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);

  const key = `/api/states/${left}/vs/${right}`;
  const { data, isLoading } = useSWR<ComparePayload>(key, swrFetcher);

  const pa = data?.profiles?.[left];
  const pb = data?.profiles?.[right];

  const radarRows = useMemo(() => {
    if (!pa || !pb) return [];
    const order = ["volume", "roi", "regulation", "corporate", "resilience"] as const;
    const labels: Record<string, string> = {
      volume: "Volume",
      roi: "ROI",
      regulation: "Regulation",
      corporate: "Corporate",
      resilience: "Climate",
    };
    return order.map((k) => ({
      subject: labels[k] || k,
      [left]: pa.radar_scores[k] ?? 0,
      [right]: pb.radar_scores[k] ?? 0,
    }));
  }, [left, right, pa, pb]);

  const runVerdict = async () => {
    setVerdictLoading(true);
    try {
      const text = await aiCall(
        "stateBattleVerdict",
        async () => {
          const r = await apiJson<{ verdict: string }>("/api/states/verdict", {
            method: "POST",
            body: JSON.stringify({ state_a: left, state_b: right }),
          });
          return r.verdict;
        },
        (raw) => raw,
      );
      setVerdict(text);
    } catch {
      setVerdict(MOCK_RESPONSES.stateBattleVerdict);
    } finally {
      setVerdictLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-content-primary">State Battle Arena</h1>
        <p className="mt-1 text-sm text-content-secondary">
          Head-to-head market comparison. Select two states. The data decides.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <StateColumn
            side="left"
            code={left}
            disabled={right}
            onChange={setLeft}
            profile={pa}
            opponent={pb}
            isLoading={isLoading}
          />
          <div className="relative flex flex-col items-center py-8">
            <div className="absolute inset-y-8 left-1/2 w-0.5 -translate-x-1/2 bg-gradient-to-b from-transparent via-accent-teal to-transparent opacity-80 shadow-teal-glow" />
            <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent-teal bg-bg-surface-2 font-display text-lg text-content-primary shadow-teal-glow">
              VS
            </div>
            <button
              type="button"
              disabled={!pa || !pb || verdictLoading}
              onClick={() => void runVerdict()}
              className="relative z-10 mt-6 rounded-lg bg-accent-amber px-4 py-2 font-display text-xs font-semibold text-bg-primary disabled:opacity-40"
            >
              {verdictLoading ? "Generating…" : "Generate market verdict"}
            </button>
          </div>
          <StateColumn
            side="right"
            code={right}
            disabled={left}
            onChange={setRight}
            profile={pb}
            opponent={pa}
            isLoading={isLoading}
          />
        </div>

        {pa && pb ? (
          <div className="mt-10 h-[400px] w-full rounded-xl border border-edge bg-bg-surface-2 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarRows} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="rgba(0,229,204,0.12)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#7A95B0", fontSize: 11 }} />
                <Radar
                  name={left}
                  dataKey={left}
                  stroke="#00E5CC"
                  fill="rgba(0,229,204,0.2)"
                  strokeWidth={2}
                  isAnimationActive
                  animationBegin={400}
                />
                <Radar
                  name={right}
                  dataKey={right}
                  stroke="#F5A623"
                  fill="rgba(245,166,35,0.2)"
                  strokeWidth={2}
                  isAnimationActive
                  animationBegin={400}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : null}

        {verdict ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 rounded-xl border border-t-2 border-t-accent-amber border-edge bg-bg-surface-2 p-6"
          >
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-accent-amber">
              AI market verdict
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-content-primary">{verdict}</p>
          </motion.div>
        ) : null}

        {pa && pb ? (
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <TopFive title={left} buildings={pa.top_5_buildings} />
            <TopFive title={right} buildings={pb.top_5_buildings} />
          </div>
        ) : null}
      </main>
    </div>
  );
}

function StateColumn({
  side,
  code,
  disabled,
  onChange,
  profile,
  opponent,
  isLoading,
}: {
  side: "left" | "right";
  code: string;
  disabled: string;
  onChange: (s: string) => void;
  profile?: StateProfile;
  opponent?: StateProfile;
  isLoading: boolean;
}) {
  const x = side === "left" ? -80 : 80;
  return (
    <motion.div
      initial={{ x, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 90, damping: 18 }}
      className="rounded-xl border border-edge bg-bg-surface-2 p-6"
    >
      <label className="font-mono text-[10px] uppercase tracking-widest text-content-secondary">
        Select state
      </label>
      <select
        value={code}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-edge bg-bg-surface px-3 py-2 text-content-primary"
      >
        {US_STATES.filter((s) => s !== disabled).map((s) => (
          <option key={s} value={s}>
            {s} — {NAMES[s] || s}
          </option>
        ))}
      </select>
      {isLoading || !profile ? (
        <p className="mt-6 text-sm text-content-secondary">Loading profile…</p>
      ) : (
        <>
          <h2 className="mt-6 font-display text-5xl font-bold text-content-primary">{profile.state}</h2>
          <p className="text-sm text-content-secondary">{NAMES[profile.state] || "United States"}</p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <Stat label=">100k roofs" value={String(profile.total_buildings_over_100k)} />
            <Stat
              label="Opportunity"
              value={`${(profile.total_annual_opportunity_gallons / 1e9).toFixed(1)}B gal`}
            />
            <Stat label="Avg score" value={profile.avg_viability_score.toFixed(1)} />
            <Stat label="Top incentive" value={`$${(profile.top_incentive_value_usd / 1000).toFixed(0)}k`} />
            <Stat label="Avg drought" value={profile.avg_drought_score.toFixed(1)} />
            <Stat
              label="Top building"
              value={profile.top_5_buildings[0]?.final_score.toFixed(0) ?? "—"}
            />
          </div>
          {opponent ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {BATTLE.map((b) => {
                const w = pickWinner(b.id, profile, opponent);
                const mine = side === "left" ? w === "a" : w === "b";
                const label =
                  w === "tie" ? "Tie" : mine ? "🏆 Winner" : "2nd";
                const cls =
                  w === "tie"
                    ? "border-accent-teal/50 text-accent-teal bg-accent-teal/5"
                    : mine
                      ? "border-accent-amber/50 text-accent-amber bg-accent-amber/10 font-semibold"
                      : "border-edge text-content-secondary/60";
                return (
                  <span
                    key={b.id}
                    className={`rounded-full border px-2 py-1 font-mono text-[10px] uppercase ${cls}`}
                  >
                    {b.label}: {label}
                  </span>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-edge bg-bg-surface px-3 py-2">
      <p className="font-mono text-[9px] uppercase text-accent-teal">{label}</p>
      <p className="font-mono text-sm text-content-primary">{value}</p>
    </div>
  );
}

function TopFive({ title, buildings }: { title: string; buildings: BuildingSummary[] }) {
  return (
    <div className="rounded-xl border border-edge bg-bg-surface-2 p-6">
      <h3 className="font-mono text-[11px] uppercase tracking-widest text-content-secondary">
        Top 5 — {title}
      </h3>
      <ol className="mt-4 space-y-3">
        {buildings.slice(0, 5).map((b, i) => (
          <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-content-secondary">
              {i + 1}. {b.name}
            </span>
            <span className="font-mono text-accent-teal">{b.final_score.toFixed(0)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
