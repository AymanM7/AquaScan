"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import useSWR from "swr";
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

import { AppNav } from "@/components/shared/AppNav";
import { apiJson, apiUrl } from "@/lib/api";
import { computeIncentiveValue, loadAdapter } from "@/lib/adapters/incentive";
import { computeWaterTwin } from "@/lib/hydrology";
import type { BuildingDetail, BoardroomMessage, IncentiveProgram } from "@/types/building";

const fetcher = (path: string) => apiJson<BuildingDetail>(path);

/* ─── Genome Fingerprint Hexagon ─── */
const PILLARS = [
  { key: "physical", label: "Physical Fit", color: "#00E5CC", max: 40 },
  { key: "economic", label: "Economic", color: "#F5A623", max: 35 },
  { key: "strategic", label: "Strategic/ESG", color: "#4ADE80", max: 25 },
  { key: "drought", label: "Drought", color: "#60A5FA", max: 10 },
  { key: "flood", label: "Flood", color: "#FB7185", max: 10 },
  { key: "corporate", label: "Corporate", color: "#A78BFA", max: 10 },
];

function GenomeFingerprint({ data }: { data: BuildingDetail }) {
  const scores: Record<string, number> = {
    physical: data.physical_score,
    economic: data.economic_score,
    strategic: data.strategic_score,
    drought: data.drought_score * 2.5,
    flood: data.fema_flood_risk * 10,
    corporate: Math.min(10, data.water_mentions * 1.2),
  };

  const cx = 140, cy = 130, radius = 55;
  return (
    <div className="rounded-xl border border-edge bg-bg-surface/80 p-5">
      <h2 className="mb-3 font-display text-lg font-semibold">Genome Fingerprint</h2>
      <div className="flex items-center justify-center">
        <svg viewBox="0 0 280 260" className="h-64 w-64">
          {PILLARS.map((p, i) => {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            const norm = Math.min(1, (scores[p.key] || 0) / p.max);
            const hexR = 28;
            const pts = Array.from({ length: 6 }, (_, j) => {
              const a = (Math.PI / 3) * j - Math.PI / 6;
              return `${x + Math.cos(a) * hexR},${y + Math.sin(a) * hexR}`;
            }).join(" ");
            return (
              <g key={p.key}>
                <polygon
                  points={pts}
                  fill={p.color}
                  fillOpacity={0.15 + norm * 0.65}
                  stroke={p.color}
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                  className="animate-pulse"
                  style={{ animationDuration: `${1.8 + i * 0.15}s` }}
                />
                <text x={x} y={y - hexR - 6} textAnchor="middle" fill={p.color} fontSize={9} fontWeight={600}>
                  {p.label}
                </text>
                <text x={x} y={y + 4} textAnchor="middle" fill="#E8F4F8" fontSize={11} fontFamily="Space Mono">
                  {(scores[p.key] || 0).toFixed(1)}
                </text>
              </g>
            );
          })}
          <text x={cx} y={cy + 2} textAnchor="middle" fill="#E8F4F8" fontSize={11} fontWeight={700} fontFamily="Syne">
            {data.genome_archetype}
          </text>
        </svg>
      </div>
    </div>
  );
}

/* ─── Rooftop Capacity Breakdown ─── */
function RooftopBreakdown({ data }: { data: BuildingDetail }) {
  const metrics = [
    { label: "Gross Roof Area", value: data.roof_sqft, note: "Full building footprint", pct: 100 },
    {
      label: "Effective Catchment",
      value: data.effective_catchment_sqft,
      note: "Minus HVAC pads & skylights",
      pct: data.roof_sqft > 0 ? (data.effective_catchment_sqft / data.roof_sqft) * 100 : 0,
    },
    {
      label: "Usable System Footprint",
      value: data.usable_footprint_sqft,
      note: "After setbacks & access paths",
      pct: data.roof_sqft > 0 ? (data.usable_footprint_sqft / data.roof_sqft) * 100 : 0,
    },
  ];
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-content-secondary">Rooftop Capacity</h3>
      {metrics.map((m) => (
        <div key={m.label}>
          <div className="flex justify-between text-xs">
            <span className="text-content-secondary">{m.label}</span>
            <span className="font-mono text-content-mono">{m.value.toLocaleString()} sqft</span>
          </div>
          <div className="mt-0.5 h-2 rounded-full bg-bg-surface-2">
            <motion.div
              className="h-2 rounded-full bg-accent-teal"
              initial={{ width: 0 }}
              animate={{ width: `${m.pct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="text-[10px] text-content-secondary/60">{m.note}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Cooling Tower Profile ─── */
function CoolingTowerProfile({ data }: { data: BuildingDetail }) {
  if (!data.ct_detected) return null;
  const tierColor =
    data.ct_demand_tier === "High" ? "text-red-400" : data.ct_demand_tier === "Medium" ? "text-amber-400" : "text-gray-400";
  return (
    <div className="rounded-xl border border-edge bg-bg-surface/80 p-4">
      <h3 className="mb-3 font-display text-sm font-semibold">Cooling Tower Profile</h3>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="Towers Detected" value={String(data.ct_count)} />
        <Stat label="Estimated Type" value={data.ct_type || "Unknown"} />
        <Stat label="Arrangement" value={data.ct_arrangement || "N/A"} />
        <Stat label="Detection Confidence" value={`${(data.ct_confidence * 100).toFixed(0)}%`} />
        <div>
          <div className="text-content-secondary">Cooling Demand Tier</div>
          <div className={`font-semibold ${tierColor}`}>
            {data.ct_demand_tier === "High" ? "🔴" : data.ct_demand_tier === "Medium" ? "🟡" : "⚪"}{" "}
            {data.ct_demand_tier}
          </div>
        </div>
        <Stat
          label="Est. Annual Cooling Water"
          value={
            data.est_cooling_consumption_gal_yr > 0
              ? `${(data.est_cooling_consumption_gal_yr / 1_000_000).toFixed(1)}M gal/yr`
              : "N/A"
          }
        />
      </div>
    </div>
  );
}

/* ─── Why-Now Event Feed ─── */
function WhyNowFeed({ events }: { events: BuildingDetail["alert_events"] }) {
  const typeIcons: Record<string, string> = {
    drought: "🔴",
    rate: "🟡",
    incentive: "🟢",
    sec: "📄",
    ordinance: "💧",
  };
  const sorted = [...events].sort((a, b) => (b.score_delta || 0) - (a.score_delta || 0)).slice(0, 5);
  if (sorted.length === 0) return null;
  return (
    <div className="rounded-xl border border-edge bg-bg-surface/80 p-4">
      <h2 className="mb-3 font-display text-lg font-semibold">Why Now</h2>
      <div className="space-y-2">
        {sorted.map((e) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-3 rounded-lg border border-edge/50 bg-bg-primary/50 p-3"
          >
            <span className="text-lg">{typeIcons[e.type] || "📋"}</span>
            <div className="flex-1">
              <p className="text-xs text-content-primary">{e.description}</p>
              <div className="mt-1 flex gap-2 text-[10px] text-content-secondary">
                <span>{e.source}</span>
                <span>·</span>
                <span>{new Date(e.event_timestamp).toLocaleDateString()}</span>
              </div>
            </div>
            {e.score_delta && (
              <span className="rounded-full bg-accent-teal/20 px-2 py-0.5 text-xs font-semibold text-accent-teal">
                +{e.score_delta} pts
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Texas Incentive Stack Card ─── */
function IncentiveStackCard({
  stack,
  combined,
  referenceCase,
}: {
  stack: IncentiveProgram[];
  combined: number;
  referenceCase: BuildingDetail["texas_reference_case"];
}) {
  if (!stack || stack.length === 0) return null;
  const eligIcons: Record<string, string> = {
    confirmed: "✅",
    likely: "⚠️",
    case_by_case: "❓",
    not_applicable: "—",
  };
  const eligLabels: Record<string, string> = {
    confirmed: "Confirmed Eligible",
    likely: "Likely Eligible — Verify",
    case_by_case: "Case-by-Case",
    not_applicable: "Not Applicable",
  };
  return (
    <div className="rounded-xl border border-edge bg-bg-surface/80 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl">⭐</span>
        <h2 className="font-display text-lg font-semibold">Texas Incentive Stack</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-edge text-left text-content-secondary">
              <th className="pb-2 pr-3">Program</th>
              <th className="pb-2 pr-3">Type</th>
              <th className="pb-2 pr-3">Value</th>
              <th className="pb-2">Eligibility</th>
            </tr>
          </thead>
          <tbody>
            {stack.map((p, i) => (
              <tr key={i} className="border-b border-edge/30">
                <td className="py-2 pr-3 font-medium text-content-primary">{p.program_name}</td>
                <td className="py-2 pr-3">
                  <span className="rounded-full bg-bg-surface-2 px-2 py-0.5 text-[10px]">{p.type}</span>
                </td>
                <td className="py-2 pr-3 font-mono text-content-mono">{p.value}</td>
                <td className="py-2">
                  <span className="whitespace-nowrap">
                    {eligIcons[p.eligibility]} {eligLabels[p.eligibility]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded-lg border border-accent-teal/30 bg-accent-teal/5 p-3">
        <div className="text-xs text-content-secondary">Combined Estimated Incentive Value</div>
        <div className="font-mono text-2xl font-bold text-accent-teal">${combined.toLocaleString()}</div>
        <div className="mt-1 text-[10px] text-content-secondary">
          Incentives applied in the ROI model above. Verify eligibility before customer commitment.
        </div>
      </div>
      {referenceCase && (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-content-secondary">
          <span className="font-semibold text-accent-amber">Reference Case:</span> {referenceCase.description}
        </div>
      )}
    </div>
  );
}

/* ─── Boardroom Clash ─── */
const PERSONAS: Record<string, { icon: string; label: string; color: string }> = {
  CFO: { icon: "💼", label: "CFO", color: "text-amber-400" },
  Facilities_VP: { icon: "🔧", label: "Facilities VP", color: "text-blue-400" },
  ESG_Officer: { icon: "🌱", label: "ESG Officer", color: "text-green-400" },
  Risk_Manager: { icon: "⚠️", label: "Risk Manager", color: "text-red-400" },
  Moderator: { icon: "⚖️", label: "Moderator", color: "text-accent-teal" },
};

function BoardroomClash({ messages, isLoading }: { messages: BoardroomMessage[]; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-edge bg-bg-surface/80 p-5">
      <h2 className="mb-3 font-display text-lg font-semibold">Boardroom Clash</h2>
      <div className="mb-3 flex gap-3">
        {Object.entries(PERSONAS)
          .filter(([k]) => k !== "Moderator")
          .map(([key, p]) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-bg-primary text-lg">
                {p.icon}
              </div>
              <span className={`text-[10px] ${p.color}`}>{p.label}</span>
            </div>
          ))}
      </div>
      <div className="max-h-80 space-y-2 overflow-y-auto">
        <AnimatePresence>
          {messages.map((m, i) => {
            const persona = PERSONAS[m.persona] || PERSONAS["Moderator"];
            const isVerdict = !!m.verdict;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-lg p-3 ${isVerdict ? "border border-accent-teal/40 bg-accent-teal/10" : "border border-edge/30 bg-bg-primary/60"}`}
              >
                <div className={`mb-1 text-xs font-semibold ${persona.color}`}>
                  {persona.icon} {persona.label}
                </div>
                <p className="text-xs text-content-primary">{m.text || m.verdict}</p>
                {m.confidence && (
                  <div className="mt-2 text-xs font-mono text-accent-teal">
                    Confidence: {m.confidence}%
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {isLoading && (
          <div className="flex items-center gap-2 p-3 text-xs text-content-secondary">
            <span className="animate-bounce">●</span>
            <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>●</span>
            <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>●</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Voice Pitch Button ─── */
function VoicePitchButton({ onGenerate, script, isLoading }: { onGenerate: () => void; script: string; isLoading: boolean }) {
  const [playing, setPlaying] = useState(false);
  const speak = useCallback(() => {
    if (!script) return;
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.rate = 0.95;
    utterance.onend = () => setPlaying(false);
    setPlaying(true);
    window.speechSynthesis.speak(utterance);
  }, [script]);

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={script ? speak : onGenerate}
        disabled={isLoading}
        className="group relative flex h-20 w-20 items-center justify-center rounded-full bg-accent-teal shadow-[0_0_20px_rgba(0,229,204,0.4)] transition-all hover:shadow-[0_0_30px_rgba(0,229,204,0.6)]"
      >
        {isLoading ? (
          <svg className="h-8 w-8 animate-spin text-bg-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : playing ? (
          <div className="flex h-8 items-end gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-bg-primary animate-pulse"
                style={{ height: `${12 + Math.random() * 20}px`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        ) : (
          <svg className="h-8 w-8 text-bg-primary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>
      <span className="text-xs text-content-secondary">
        {script ? (playing ? "Playing..." : "Tap to replay") : "Generate Voice Pitch"}
      </span>
      {script && (
        <div className="max-h-24 w-full overflow-y-auto rounded-lg border border-edge bg-bg-primary/60 p-2 font-mono text-[10px] text-content-secondary">
          {script}
        </div>
      )}
    </div>
  );
}

/* ─── Viability Score Ring ─── */
function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? "#00E5CC" : score >= 60 ? "#3B8ADD" : score >= 40 ? "#1D9E75" : "#283240";
  return (
    <svg width={size} height={size} className="drop-shadow-lg">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a2744" strokeWidth={6} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - progress }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle" fill="#E8F4F8" fontSize={size * 0.28} fontFamily="Space Mono" fontWeight={700}>
        {score.toFixed(0)}
      </text>
    </svg>
  );
}

/* ─── WRAI Badge ─── */
function WRAIBadge({ wrai, badge }: { wrai: number; badge: string }) {
  const color = badge === "Act Now" ? "bg-red-500/20 text-red-400 border-red-500/30" :
    badge === "High Priority" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
      badge === "Monitor" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
        "bg-gray-500/20 text-gray-400 border-gray-500/30";
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${color}`}>
      <span className="font-mono">{wrai.toFixed(0)}</span>
      <span>{badge}</span>
    </div>
  );
}

/* ─── Stat Helper ─── */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-content-secondary">{label}</div>
      <div className="font-mono text-content-mono">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-edge bg-bg-primary/60 p-3">
      <div className="text-xs text-content-secondary">{label}</div>
      <div className="font-mono text-lg text-content-mono">{value}</div>
    </div>
  );
}

/* ─────────── MAIN PAGE ─────────── */
export default function BuildingPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/building/${id}` : null, fetcher, {
    revalidateOnFocus: false,
  });

  // Water Twin state
  const [rainfallAdj, setRainfallAdj] = useState(0);
  const [rateMult, setRateMult] = useState(1);
  const [reuse, setReuse] = useState(0.85);
  const [runoff, setRunoff] = useState(0.85);
  const [scenario, setScenario] = useState<string>("normal");

  const adapter = useMemo(() => loadAdapter("dallas_tx"), []);
  const twin = useMemo(() => {
    if (!data) return null;
    const capex = data.roof_sqft * 0.018;
    const inv = computeIncentiveValue(adapter, data.roof_sqft, capex);
    return computeWaterTwin({
      roof_sqft: data.roof_sqft,
      annual_rain_inches: data.annual_rain_inches || 34,
      water_rate_per_kgal: data.water_rate_per_kgal || 4.5,
      sewer_rate_per_kgal: data.sewer_rate_per_kgal || 5.1,
      stormwater_fee_annual: data.stormwater_fee_annual || 0,
      rebate_usd: inv.rebate_usd,
      sales_tax_exempt: inv.sales_tax_exempt,
      property_tax_exempt: inv.property_tax_exempt,
      rainfall_adj: rainfallAdj,
      rate_multiplier: rateMult,
      reuse_fraction: reuse,
      runoff_coefficient: runoff,
    });
  }, [adapter, data, rainfallAdj, rateMult, reuse, runoff]);

  const applyScenario = useCallback((s: string) => {
    setScenario(s);
    switch (s) {
      case "d3_drought": setRainfallAdj(-0.35); setRateMult(1); setReuse(0.85); setRunoff(0.85); break;
      case "rate_shock": setRainfallAdj(0); setRateMult(1.5); setReuse(0.85); setRunoff(0.85); break;
      case "flood": setRainfallAdj(0.15); setRateMult(1); setReuse(0.90); setRunoff(0.90); break;
      default: setRainfallAdj(0); setRateMult(1); setReuse(0.85); setRunoff(0.85); break;
    }
  }, []);

  // AI state
  const [memoText, setMemoText] = useState("");
  const [memoMode, setMemoMode] = useState<"Sales" | "Engineering" | "Executive">("Sales");
  const [memoLoading, setMemoLoading] = useState(false);
  const [boardroom, setBoardroom] = useState<BoardroomMessage[]>([]);
  const [boardroomLoading, setBoardroomLoading] = useState(false);
  const [voice, setVoice] = useState("");
  const [voiceLoading, setVoiceLoading] = useState(false);
  const { user } = useAuth0();

  const streamMemo = async () => {
    if (!id) return;
    setMemoText("");
    setMemoLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/building/${id}/memo`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: memoMode }),
      });
      if (!res.ok || !res.body) {
        setMemoText("Memo unavailable — configure ANTHROPIC_API_KEY.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setMemoText((t) => t + decoder.decode(value, { stream: true }));
      }
    } finally {
      setMemoLoading(false);
    }
  };

  const loadBoardroom = async () => {
    if (!id) return;
    setBoardroomLoading(true);
    setBoardroom([]);
    try {
      const json = await apiJson<BoardroomMessage[] | { dialogue: BoardroomMessage[] }>(
        `/api/building/${id}/boardroom`,
        { method: "POST" },
      );
      const messages = Array.isArray(json) ? json : (json as any).dialogue || [];
      // Stagger display
      for (let i = 0; i < messages.length; i++) {
        await new Promise((r) => setTimeout(r, 700));
        setBoardroom((prev) => [...prev, messages[i]]);
      }
    } catch {
      setBoardroom([{ persona: "Moderator", verdict: "Boardroom unavailable — add ANTHROPIC_API_KEY.", confidence: 0 }]);
    } finally {
      setBoardroomLoading(false);
    }
  };

  const loadVoice = async () => {
    if (!id) return;
    setVoiceLoading(true);
    try {
      const json = await apiJson<{ script: string }>(`/api/building/${id}/voice-script`, { method: "POST" });
      setVoice(json.script);
    } catch {
      setVoice("Voice script unavailable — add GEMINI_API_KEY.");
    } finally {
      setVoiceLoading(false);
    }
  };

  // Payback crossover year for chart
  const crossoverYear = twin?.savings_curve.find((d) => d.cumulative_savings >= 0)?.year;

  return (
    <div className="min-h-screen bg-bg-primary text-content-primary">
      <AppNav />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {/* Back link */}
        <Link href="/map" className="text-xs text-accent-teal underline-offset-2 hover:underline">
          ← Back to map
        </Link>

        {error && (
          <div className="rounded-md border border-accent-coral/40 p-4 text-sm text-accent-coral">
            Could not load building. Confirm API is running and seeded.
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-teal border-t-transparent" />
          </div>
        )}

        {data && (
          <>
            {/* ═══ Section 1: Hero Header ═══ */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-start gap-6"
            >
              <div className="flex-1">
                <h1 className="font-display text-3xl font-semibold">{data.name}</h1>
                <p className="mt-1 text-sm text-content-secondary">
                  {data.address}, {data.city}, {data.state} · {data.sector}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-accent-teal/15 px-3 py-1 text-sm font-semibold text-accent-teal">
                    {data.genome_archetype}
                  </span>
                  <WRAIBadge wrai={data.wrai} badge={data.wrai_badge} />
                  {data.ct_detected && data.ct_demand_tier === "High" && data.roof_sqft >= 100_000 && (
                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">
                      Priority Flag
                    </span>
                  )}
                </div>
                {/* Quick stats */}
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-5">
                  <div>
                    <div className="text-content-secondary">Gross Roof</div>
                    <div className="font-mono text-sm text-content-mono">{data.roof_sqft.toLocaleString()} sqft</div>
                  </div>
                  <div>
                    <div className="text-content-secondary">Eff. Catchment</div>
                    <div className="font-mono text-sm text-content-mono">{data.effective_catchment_sqft.toLocaleString()} sqft</div>
                  </div>
                  <div>
                    <div className="text-content-secondary">Usable Footprint</div>
                    <div className="font-mono text-sm text-content-mono">{data.usable_footprint_sqft.toLocaleString()} sqft</div>
                  </div>
                  <div>
                    <div className="text-content-secondary">Cooling</div>
                    <div className="font-mono text-sm text-content-mono">
                      {data.ct_detected ? `${data.ct_demand_tier} (${data.ct_count})` : "None"}
                    </div>
                  </div>
                  <div>
                    <div className="text-content-secondary">Payback</div>
                    <div className="font-mono text-sm text-content-mono">{data.payback_years.toFixed(1)} yrs</div>
                  </div>
                </div>
              </div>
              <ScoreRing score={data.final_score} size={110} />
            </motion.section>

            {/* ═══ Section 2: Satellite & Roof Evidence ═══ */}
            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-edge bg-bg-surface/80 p-4">
                <h2 className="mb-3 font-display text-lg font-semibold">Satellite Evidence</h2>
                {data.raw_chip_url ? (
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-bg-surface-2">
                    <img src={data.raw_chip_url} alt="Satellite" className="h-full w-full object-cover opacity-70" />
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-content-secondary">
                      NAIP Satellite Chip + AI Overlay
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-lg bg-bg-surface-2 text-xs text-content-secondary">
                    Satellite imagery placeholder — connect NAIP data source
                  </div>
                )}
                <div className="mt-4">
                  <RooftopBreakdown data={data} />
                </div>
              </div>
              <div className="space-y-4">
                <CoolingTowerProfile data={data} />
                <GenomeFingerprint data={data} />
              </div>
            </section>

            {/* ═══ Section 3: Pillar Breakdown ═══ */}
            <section className="rounded-xl border border-edge bg-bg-surface/80 p-4">
              <h2 className="font-display text-lg font-semibold">Score Decomposition</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {[
                  { label: "Physical Fit", score: data.physical_score, cap: 40, color: "bg-accent-teal" },
                  { label: "Economic Viability", score: data.economic_score, cap: 35, color: "bg-accent-amber" },
                  { label: "Strategic/ESG", score: data.strategic_score, cap: 25, color: "bg-accent-green" },
                ].map((p) => (
                  <div key={p.label}>
                    <div className="flex justify-between text-xs text-content-secondary">
                      <span>{p.label} ({p.cap} pts max)</span>
                      <span className="font-mono text-content-mono">{p.score.toFixed(1)}</span>
                    </div>
                    <div className="mt-1 h-2.5 rounded-full bg-bg-surface-2">
                      <motion.div
                        className={`h-2.5 rounded-full ${p.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (p.score / p.cap) * 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-content-secondary">
                <span>Confidence: <span className="font-mono text-accent-blue">{(data.confidence_composite * 100).toFixed(1)}%</span></span>
                <span>V_adj = V_raw × (0.6 + 0.4 × {data.confidence_composite.toFixed(2)})</span>
                <button
                  type="button"
                  className="ml-auto rounded-md border border-edge px-2 py-1 text-xs hover:border-edge-active"
                  onClick={() => { apiJson(`/api/building/${id}/score/recompute`).then(() => mutate()); }}
                >
                  Recompute
                </button>
              </div>
            </section>

            {/* ═══ Section 4: Water Twin Simulator ═══ */}
            <section className="rounded-xl border border-edge bg-bg-surface/80 p-5">
              <h2 className="mb-1 font-display text-lg font-semibold">Rain-to-Resilience Water Twin</h2>
              <p className="mb-4 text-xs text-content-secondary">
                Annual Gallons = Roof Area × Annual Rain × 0.623 × Runoff Coefficient × Pitch Multiplier
              </p>
              {/* Scenario presets */}
              <div className="mb-4 flex flex-wrap gap-2">
                {[
                  { key: "normal", label: "Normal Year" },
                  { key: "d3_drought", label: "D3 Drought" },
                  { key: "rate_shock", label: "Rate Shock" },
                  { key: "flood", label: "Flood Year" },
                  { key: "custom", label: "Custom" },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => applyScenario(s.key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      scenario === s.key
                        ? "bg-accent-teal text-bg-primary"
                        : "border border-edge text-content-secondary hover:border-edge-active"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs text-content-secondary">
                  Rainfall Adjustment ({(rainfallAdj * 100).toFixed(0)}%)
                  <input type="range" min={-0.4} max={0.2} step={0.01} value={rainfallAdj}
                    onChange={(e) => { setRainfallAdj(Number(e.target.value)); setScenario("custom"); }}
                    className="mt-1 w-full accent-accent-teal" />
                </label>
                <label className="text-xs text-content-secondary">
                  Rate Multiplier ({rateMult.toFixed(2)}×)
                  <input type="range" min={1} max={2} step={0.01} value={rateMult}
                    onChange={(e) => { setRateMult(Number(e.target.value)); setScenario("custom"); }}
                    className="mt-1 w-full accent-accent-teal" />
                </label>
                <label className="text-xs text-content-secondary">
                  Reuse Fraction ({(reuse * 100).toFixed(0)}%)
                  <input type="range" min={0.5} max={0.95} step={0.01} value={reuse}
                    onChange={(e) => { setReuse(Number(e.target.value)); setScenario("custom"); }}
                    className="mt-1 w-full accent-accent-teal" />
                </label>
                <label className="text-xs text-content-secondary">
                  System Efficiency ({(runoff * 100).toFixed(0)}%)
                  <input type="range" min={0.75} max={0.95} step={0.01} value={runoff}
                    onChange={(e) => { setRunoff(Number(e.target.value)); setScenario("custom"); }}
                    className="mt-1 w-full accent-accent-teal" />
                </label>
              </div>
              {twin && (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <Metric label="Annual Capture" value={`${(twin.annual_gallons / 1_000_000).toFixed(2)}M gal`} />
                    <Metric label="Annual Savings" value={`$${twin.annual_savings_usd.toLocaleString()}`} />
                    <Metric label="Payback" value={`${twin.payback_years.toFixed(1)} yrs`} />
                    <Metric label="IRR" value={`${twin.irr_pct.toFixed(1)}%`} />
                    <Metric label="Stormwater Avoidance" value={`$${twin.stormwater_fee_avoidance.toLocaleString()}`} />
                    <Metric label="20yr NPV" value={`$${twin.npv_20yr.toLocaleString()}`} />
                  </div>
                  <div className="mt-6 h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={twin.savings_curve}>
                        <defs>
                          <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00E5CC" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#00E5CC" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="year" stroke="#7a95b0" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#7a95b0" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ background: "#0d1b2e", border: "1px solid rgba(0,229,204,0.2)", fontSize: 11 }} />
                        {crossoverYear && (
                          <ReferenceLine x={crossoverYear} stroke="#F5A623" strokeDasharray="4 4" label={{ value: "Payback", fill: "#F5A623", fontSize: 10 }} />
                        )}
                        <Area type="monotone" dataKey="cumulative_savings" stroke="#00e5cc" fill="url(#tealGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </section>

            {/* ═══ Section 5: Why-Now + Incentive Stack ═══ */}
            <div className="grid gap-4 lg:grid-cols-2">
              <WhyNowFeed events={data.alert_events} />
              <IncentiveStackCard
                stack={data.incentive_stack}
                combined={data.combined_incentive_estimate}
                referenceCase={data.texas_reference_case}
              />
            </div>

            {/* ═══ Section 6: AI Deal Strategist ═══ */}
            <section className="rounded-xl border border-edge bg-bg-surface/80 p-5">
              <h2 className="mb-3 font-display text-lg font-semibold">AI Deal Strategist</h2>
              <div className="mb-3 flex gap-2">
                {(["Sales", "Engineering", "Executive"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMemoMode(m)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      memoMode === m
                        ? "bg-accent-teal text-bg-primary"
                        : "border border-edge text-content-secondary hover:border-edge-active"
                    }`}
                  >
                    {m}
                  </button>
                ))}
                <button
                  type="button"
                  className="ml-auto rounded-md bg-accent-teal px-4 py-1.5 text-xs font-semibold text-bg-primary"
                  onClick={() => void streamMemo()}
                  disabled={memoLoading}
                >
                  {memoLoading ? "Generating..." : "Generate Brief"}
                </button>
              </div>
              <pre className="max-h-72 overflow-auto rounded-lg border border-edge bg-bg-primary p-4 text-xs text-content-secondary whitespace-pre-wrap leading-relaxed">
                {memoText || `Click "Generate Brief" to create a ${memoMode} prospect brief for this building.`}
              </pre>
              {memoText && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-edge px-3 py-1 text-xs hover:border-edge-active"
                    onClick={() => navigator.clipboard.writeText(memoText)}
                  >
                    Copy Brief
                  </button>
                </div>
              )}
            </section>

            {/* ═══ Section 7 + 8: Voice Pitch & Boardroom ═══ */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-edge bg-bg-surface/80 p-5">
                <h2 className="mb-4 font-display text-lg font-semibold">Water Pitch Voice</h2>
                <VoicePitchButton onGenerate={loadVoice} script={voice} isLoading={voiceLoading} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  {boardroom.length === 0 && (
                    <button
                      type="button"
                      className="w-full rounded-xl border border-edge bg-bg-surface/80 px-4 py-8 text-sm font-medium text-content-secondary hover:border-accent-teal hover:text-accent-teal transition-colors"
                      onClick={() => void loadBoardroom()}
                      disabled={boardroomLoading}
                    >
                      {boardroomLoading ? "Loading debate..." : "Start Boardroom Clash"}
                    </button>
                  )}
                </div>
                {boardroom.length > 0 && (
                  <BoardroomClash messages={boardroom} isLoading={boardroomLoading} />
                )}
              </div>
            </div>

            {/* ═══ Corporate Intelligence ═══ */}
            {data.owner_name && (
              <section className="rounded-xl border border-edge bg-bg-surface/80 p-4">
                <h2 className="mb-3 font-display text-lg font-semibold">Corporate Intelligence</h2>
                <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label="Owner" value={data.owner_name} />
                  <Stat label="Corporate Parent" value={data.corporate_parent || "—"} />
                  <Stat label="Ticker" value={data.ticker || "—"} />
                  <Stat label="SEC CIK" value={data.sec_cik || "—"} />
                  <Stat label="ESG Score" value={data.esg_score.toFixed(1)} />
                  <Stat label="Water Mentions (10-K)" value={String(data.water_mentions)} />
                  <Stat label="LEED" value={data.leed_certified ? `${data.leed_level || "Certified"}` : "None"} />
                  <Stat label="ESG Accelerator" value={data.esg_accelerator ? "Yes (>5 mentions)" : "No"} />
                </div>
                {data.corporate_parent && (
                  <div className="mt-3">
                    <Link
                      href={`/portfolio/${encodeURIComponent(data.corporate_parent)}`}
                      className="text-xs text-accent-teal underline-offset-2 hover:underline"
                    >
                      View full portfolio for {data.corporate_parent} →
                    </Link>
                  </div>
                )}
              </section>
            )}

            {/* ═══ Links ═══ */}
            <div className="flex flex-wrap gap-3 text-xs">
              <Link href={`/dealroom/${id}`} className="rounded-md bg-accent-teal px-4 py-2 font-semibold text-bg-primary">
                Open Dealroom
              </Link>
              <Link href="/automation" className="rounded-md border border-edge px-4 py-2 hover:border-edge-active">
                Automation Center
              </Link>
              <Link href="/inbox" className="rounded-md border border-edge px-4 py-2 hover:border-edge-active">
                Rep Inbox
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
