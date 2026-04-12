"use client";

import { useAuth0 } from "@auth0/auth0-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppNav } from "@/components/shared/AppNav";
import { apiJson, apiUrl } from "@/lib/api";
import { computeIncentiveValue, loadAdapter } from "@/lib/adapters/incentive";
import { computeWaterTwin } from "@/lib/hydrology";
import type { BuildingDetail } from "@/types/building";

const fetcher = (path: string) => apiJson<BuildingDetail>(path);

export default function BuildingPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/building/${id}` : null, fetcher, {
    revalidateOnFocus: false,
  });

  const [rainfallAdj, setRainfallAdj] = useState(0);
  const [rateMult, setRateMult] = useState(1);
  const [reuse, setReuse] = useState(0.85);
  const [runoff, setRunoff] = useState(0.85);

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

  const [memoText, setMemoText] = useState("");
  const [boardroom, setBoardroom] = useState<unknown | null>(null);
  const [voice, setVoice] = useState("");
  const [memoMode, setMemoMode] = useState<"Sales" | "Engineering" | "Executive">("Sales");
  const { user } = useAuth0();

  const streamMemo = async () => {
    if (!id) return;
    setMemoText("");
    const res = await fetch(apiUrl(`/api/building/${id}/memo`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: memoMode }),
    });
    if (!res.ok || !res.body) {
      setMemoText("Memo unavailable (configure Anthropic per PHASE_06_AI_INTEGRATION.md).");
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      setMemoText((t) => t + decoder.decode(value, { stream: true }));
    }
  };

  const loadBoardroom = async () => {
    if (!id) return;
    try {
      const json = await apiJson<unknown>(`/api/building/${id}/boardroom`, { method: "POST" });
      setBoardroom(json);
    } catch {
      setBoardroom({ error: "Boardroom unavailable — add ANTHROPIC_API_KEY." });
    }
  };

  const loadVoice = async () => {
    if (!id) return;
    try {
      const json = await apiJson<{ script: string }>(`/api/building/${id}/voice-script`, {
        method: "POST",
      });
      setVoice(json.script);
    } catch {
      setVoice("Voice script unavailable — add GEMINI_API_KEY.");
    }
  };

  const recompute = async () => {
    if (!id) return;
    await apiJson(`/api/building/${id}/score/recompute`);
    await mutate();
  };

  return (
    <div className="min-h-screen bg-bg-primary text-content-primary">
      <AppNav />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/map" className="text-xs text-accent-teal underline-offset-2 hover:underline">
              ← Back to map
            </Link>
            <h1 className="mt-2 font-display text-3xl font-semibold">
              {isLoading ? "Loading…" : data?.name ?? "Building"}
            </h1>
            {data && (
              <p className="text-sm text-content-secondary">
                {data.address}, {data.city}, {data.state} · {data.sector}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-edge px-3 py-2 text-sm hover:border-edge-active"
              onClick={() => void recompute()}
            >
              Recompute score
            </button>
            <button
              type="button"
              className="rounded-md bg-accent-teal px-3 py-2 text-sm font-semibold text-bg-primary"
              onClick={() =>
                void apiJson("/api/debrief/generate", {
                  method: "POST",
                  body: JSON.stringify({ user_id: user?.sub ?? "demo-local-user" }),
                }).catch(() => {})
              }
            >
              Queue login debrief
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-accent-coral/40 p-4 text-sm text-accent-coral">
            Could not load building. Confirm API is running and seeded.
          </div>
        )}

        {data && (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-edge bg-bg-surface/80 p-4">
                <div className="text-xs text-content-secondary">Final score</div>
                <div className="font-display text-4xl text-accent-teal">{data.final_score.toFixed(1)}</div>
                <div className="mt-2 text-xs text-content-secondary">WRAI {data.wrai.toFixed(1)}</div>
                <div className="text-xs text-content-secondary">Badge: {data.wrai_badge}</div>
              </div>
              <div className="rounded-xl border border-edge bg-bg-surface/80 p-4">
                <div className="text-xs text-content-secondary">Genome</div>
                <div className="text-sm font-semibold text-content-primary">{data.genome_archetype}</div>
                <div className="mt-2 text-xs text-content-secondary">Hydro thesis: {data.hydro_thesis}</div>
              </div>
              <div className="rounded-xl border border-edge bg-bg-surface/80 p-4">
                <div className="text-xs text-content-secondary">Confidence</div>
                <div className="font-mono text-2xl text-accent-blue">
                  {(data.confidence_composite * 100).toFixed(1)}%
                </div>
                <div className="mt-2 text-xs text-content-secondary">
                  Roof CV {data.roof_confidence.toFixed(2)} · Area {data.area_confidence.toFixed(2)}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-edge bg-bg-surface/80 p-4">
              <h2 className="font-display text-lg font-semibold">Pillar breakdown</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {[
                  ["Physical", data.physical_score, 40],
                  ["Economic", data.economic_score, 35],
                  ["Strategic", data.strategic_score, 25],
                ].map(([label, score, cap]) => (
                  <div key={label as string}>
                    <div className="flex justify-between text-xs text-content-secondary">
                      <span>{label}</span>
                      <span className="font-mono text-content-mono">{(score as number).toFixed(1)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-bg-surface-2">
                      <div
                        className="h-2 rounded-full bg-accent-teal"
                        style={{
                          width: `${Math.min(100, ((score as number) / (cap as number)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-edge bg-bg-surface/80 p-4">
              <h2 className="font-display text-lg font-semibold">Water Twin (what-if)</h2>
              <p className="text-xs text-content-secondary">
                Client-side twin mirrors <code className="font-mono">PHASE_02_SCORING_ENGINE.md</code> /{" "}
                <code className="font-mono">frontend/lib/hydrology.ts</code>.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-xs text-content-secondary">
                  Rainfall adj ({rainfallAdj.toFixed(2)})
                  <input
                    type="range"
                    min={-0.4}
                    max={0.2}
                    step={0.01}
                    value={rainfallAdj}
                    onChange={(e) => setRainfallAdj(Number(e.target.value))}
                    className="mt-1 w-full accent-accent-teal"
                  />
                </label>
                <label className="text-xs text-content-secondary">
                  Rate multiplier ({rateMult.toFixed(2)}×)
                  <input
                    type="range"
                    min={1}
                    max={2}
                    step={0.01}
                    value={rateMult}
                    onChange={(e) => setRateMult(Number(e.target.value))}
                    className="mt-1 w-full accent-accent-teal"
                  />
                </label>
                <label className="text-xs text-content-secondary">
                  Reuse fraction ({reuse.toFixed(2)})
                  <input
                    type="range"
                    min={0.5}
                    max={0.95}
                    step={0.01}
                    value={reuse}
                    onChange={(e) => setReuse(Number(e.target.value))}
                    className="mt-1 w-full accent-accent-teal"
                  />
                </label>
                <label className="text-xs text-content-secondary">
                  Runoff coefficient ({runoff.toFixed(2)})
                  <input
                    type="range"
                    min={0.75}
                    max={0.95}
                    step={0.01}
                    value={runoff}
                    onChange={(e) => setRunoff(Number(e.target.value))}
                    className="mt-1 w-full accent-accent-teal"
                  />
                </label>
              </div>
              {twin && (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Metric label="Annual gallons" value={twin.annual_gallons.toLocaleString()} />
                  <Metric label="Annual savings" value={`$${twin.annual_savings_usd.toLocaleString()}`} />
                  <Metric label="Payback (yrs)" value={twin.payback_years.toFixed(1)} />
                  <Metric label="IRR" value={`${twin.irr_pct.toFixed(1)}%`} />
                  <Metric label="NPV 20y" value={`$${twin.npv_20yr.toLocaleString()}`} />
                  <Metric label="Stormwater avoidance" value={`$${twin.stormwater_fee_avoidance}`} />
                </div>
              )}
              {twin && (
                <div className="mt-6 h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={twin.savings_curve}>
                      <XAxis dataKey="year" stroke="#7a95b0" />
                      <YAxis stroke="#7a95b0" />
                      <Tooltip
                        contentStyle={{ background: "#0d1b2e", border: "1px solid rgba(0,229,204,0.2)" }}
                      />
                      <Line type="monotone" dataKey="cumulative_savings" stroke="#00e5cc" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-edge bg-bg-surface/80 p-4">
              <h2 className="font-display text-lg font-semibold">AI cockpit</h2>
              <p className="text-xs text-content-secondary">
                Wired to FastAPI routes from <code className="font-mono">PHASE_06_AI_INTEGRATION.md</code>.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="rounded-md border border-edge bg-bg-primary px-2 py-2 text-sm"
                      value={memoMode}
                      onChange={(e) => setMemoMode(e.target.value as typeof memoMode)}
                    >
                      <option>Sales</option>
                      <option>Engineering</option>
                      <option>Executive</option>
                    </select>
                    <button
                      type="button"
                      className="rounded-md bg-accent-teal px-3 py-2 text-sm font-semibold text-bg-primary"
                      onClick={() => void streamMemo()}
                    >
                      Stream deal memo
                    </button>
                  </div>
                  <pre className="max-h-64 overflow-auto rounded-md border border-edge bg-bg-primary p-3 text-xs text-content-secondary whitespace-pre-wrap">
                    {memoText || "Memo output will stream here."}
                  </pre>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    className="w-full rounded-md border border-edge px-3 py-2 text-sm hover:border-edge-active"
                    onClick={() => void loadBoardroom()}
                  >
                    Boardroom JSON
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-md border border-edge px-3 py-2 text-sm hover:border-edge-active"
                    onClick={() => void loadVoice()}
                  >
                    Voice script
                  </button>
                  <pre className="max-h-40 overflow-auto rounded-md border border-edge bg-bg-primary p-3 text-xs text-content-secondary whitespace-pre-wrap">
                    {voice || "Voice script…"}
                  </pre>
                </div>
              </div>
              {boardroom != null && (
                <pre className="mt-4 max-h-64 overflow-auto rounded-md border border-edge bg-bg-primary p-3 text-xs text-content-secondary whitespace-pre-wrap">
                  {JSON.stringify(boardroom, null, 2)}
                </pre>
              )}
            </section>
          </>
        )}
      </main>
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
