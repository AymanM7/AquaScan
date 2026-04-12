"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";

import { ApprovalGate } from "@/components/shared/ApprovalGate";
import { AppNav } from "@/components/shared/AppNav";
import { apiJson, swrFetcher } from "@/lib/api";
import type { BuildingDetail } from "@/types/building";

type MemoPayload = {
  memo: string;
  mode: string;
  boardroom_verdict: string | null;
};

function DossierStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-edge bg-bg-primary/60 px-3 py-2">
      <p className="font-mono text-[9px] uppercase tracking-wider text-accent-teal">{label}</p>
      <p className="font-mono text-sm text-content-primary">{value}</p>
    </div>
  );
}

export default function DealroomPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data: building } = useSWR<BuildingDetail>(id ? `/api/building/${id}` : null, swrFetcher);
  const { data: memo } = useSWR<MemoPayload>(id ? `/api/dealroom/${id}/cached-memo` : null, swrFetcher);
  const [sent, setSent] = useState<string | null>(null);

  if (!building) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <AppNav />
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-teal border-t-transparent" />
        </div>
      </div>
    );
  }

  const wraiColor = building.wrai >= 80 ? "text-red-400" : building.wrai >= 60 ? "text-amber-400" : "text-blue-400";

  return (
    <div className="min-h-screen bg-bg-primary">
      <AppNav />
      <main className="mx-auto max-w-[900px] px-4 py-10">
        <Link href={`/building/${id}`} className="text-xs text-accent-teal hover:underline">
          ← Back to intelligence view
        </Link>

        {/* ═══ 1. Building Summary ═══ */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 border-b border-edge pb-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-content-primary">{building.name}</h1>
              <p className="mt-1 text-sm text-content-secondary">
                {building.address}, {building.city}, {building.state}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-accent-teal/15 px-3 py-1 text-xs font-semibold text-accent-teal">
                  {building.genome_archetype}
                </span>
                <span className={`rounded-full border border-current/20 px-3 py-1 text-xs font-semibold ${wraiColor}`}>
                  WRAI {building.wrai.toFixed(0)} · {building.wrai_badge}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-4xl font-bold text-accent-teal">{building.final_score.toFixed(0)}</div>
              <div className="text-xs text-content-secondary">Viability Score</div>
            </div>
          </div>
        </motion.header>

        {/* ═══ 2. Rooftop Capacity ═══ */}
        <section className="mt-8 rounded-xl border border-edge bg-bg-surface-2 p-6">
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-content-secondary">
            Rooftop Capacity & Cooling Profile
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <DossierStat label="Gross Roof Area" value={`${building.roof_sqft.toLocaleString()} sqft`} />
            <DossierStat label="Effective Catchment" value={`${building.effective_catchment_sqft.toLocaleString()} sqft`} />
            <DossierStat label="Usable System Footprint" value={`${building.usable_footprint_sqft.toLocaleString()} sqft`} />
          </div>
          {building.ct_detected && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <DossierStat label="Cooling Towers" value={`${building.ct_count} detected`} />
              <DossierStat label="Tower Type" value={building.ct_type || "Unknown"} />
              <DossierStat label="Demand Tier" value={building.ct_demand_tier} />
              <DossierStat label="Confidence" value={`${(building.ct_confidence * 100).toFixed(0)}%`} />
              <DossierStat label="Est. Cooling Consumption" value={
                building.est_cooling_consumption_gal_yr > 0
                  ? `${(building.est_cooling_consumption_gal_yr / 1_000_000).toFixed(1)}M gal/yr`
                  : "N/A"
              } />
            </div>
          )}
        </section>

        {/* ═══ 3. Satellite Evidence ═══ */}
        <section className="mt-6 rounded-xl border border-edge bg-bg-surface-2 p-6">
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-content-secondary">
            Satellite Evidence
          </h2>
          {building.raw_chip_url ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { url: building.raw_chip_url, label: "Raw Chip" },
                { url: building.masked_chip_url, label: "Masked Chip" },
                { url: building.roof_mask_url, label: "Roof Mask" },
              ].map((img) => (
                <div key={img.label} className="text-center">
                  <div className="aspect-square rounded-lg border border-edge bg-bg-primary overflow-hidden">
                    {img.url ? (
                      <img src={img.url} alt={img.label} className="h-full w-full object-cover opacity-70" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-content-secondary">N/A</div>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-content-secondary">{img.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-content-secondary">Satellite imagery not yet available.</p>
          )}
        </section>

        {/* ═══ 4. Water Twin Snapshot ═══ */}
        <section className="mt-6 rounded-xl border border-edge bg-bg-surface-2 p-6">
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-content-secondary">
            Water Twin Output
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <DossierStat label="Annual Capture" value={`${(building.annual_gallons / 1e6).toFixed(2)}M gal`} />
            <DossierStat label="Annual Savings" value={`$${Math.round(building.annual_savings_usd).toLocaleString()}`} />
            <DossierStat label="Payback Period" value={`${building.payback_years.toFixed(1)} years`} />
            <DossierStat label="IRR" value={`${building.irr_pct.toFixed(1)}%`} />
            <DossierStat label="20yr NPV" value={`$${Math.round(building.npv_20yr).toLocaleString()}`} />
            <DossierStat label="Stormwater Avoidance" value={`$${Math.round(building.stormwater_fee_avoidance).toLocaleString()}/yr`} />
          </div>
        </section>

        {/* ═══ 5. Texas Incentive Stack ═══ */}
        {building.incentive_stack && building.incentive_stack.length > 0 && (
          <section className="mt-6 rounded-xl border border-edge bg-bg-surface-2 p-6">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-content-secondary">
              Incentive Stack
            </h2>
            <div className="mt-4 overflow-x-auto">
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
                  {building.incentive_stack.map((p, i) => (
                    <tr key={i} className="border-b border-edge/30">
                      <td className="py-2 pr-3 font-medium text-content-primary">{p.program_name}</td>
                      <td className="py-2 pr-3"><span className="rounded-full bg-bg-surface px-2 py-0.5 text-[10px]">{p.type}</span></td>
                      <td className="py-2 pr-3 font-mono text-content-mono">{p.value}</td>
                      <td className="py-2">{p.eligibility === "confirmed" ? "✅" : p.eligibility === "likely" ? "⚠️" : "❓"} {p.eligibility}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 rounded-lg border border-accent-teal/30 bg-accent-teal/5 p-3">
              <span className="text-xs text-content-secondary">Combined estimate: </span>
              <span className="font-mono text-lg font-bold text-accent-teal">
                ${building.combined_incentive_estimate.toLocaleString()}
              </span>
            </div>
            {building.texas_reference_case && (
              <div className="mt-2 rounded-lg bg-amber-500/5 border border-amber-500/20 p-2 text-xs text-content-secondary">
                <strong className="text-accent-amber">Reference:</strong> {building.texas_reference_case.description}
              </div>
            )}
          </section>
        )}

        {/* ═══ 6. ROI Summary ═══ */}
        <section className="mt-6 rounded-xl border border-edge bg-bg-surface-2 p-6">
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-content-secondary">
            Score Decomposition
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <DossierStat label="Physical Fit (40)" value={building.physical_score.toFixed(1)} />
            <DossierStat label="Economic (35)" value={building.economic_score.toFixed(1)} />
            <DossierStat label="Strategic/ESG (25)" value={building.strategic_score.toFixed(1)} />
          </div>
          <div className="mt-3 text-xs text-content-secondary">
            Confidence: {(building.confidence_composite * 100).toFixed(1)}% ·
            V_adj = {building.final_score.toFixed(1)}
          </div>
        </section>

        {/* ═══ 7. Why-Now Events ═══ */}
        {building.alert_events.length > 0 && (
          <section className="mt-6 rounded-xl border border-edge bg-bg-surface-2 p-6">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-content-secondary">
              Why-Now Events
            </h2>
            <div className="mt-4 space-y-2">
              {building.alert_events.slice(0, 8).map((e) => (
                <div key={e.id} className="flex items-center gap-3 rounded-lg border border-edge/30 bg-bg-primary/40 p-2 text-xs">
                  <span>{e.type === "drought" ? "🔴" : e.type === "rate" ? "🟡" : e.type === "incentive" ? "🟢" : "📄"}</span>
                  <span className="flex-1 text-content-primary">{e.description}</span>
                  {e.score_delta && <span className="font-mono text-accent-teal">+{e.score_delta}</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═══ 8. Generated Memo ═══ */}
        {memo?.memo && (
          <section className="mt-6 rounded-xl border border-edge bg-bg-surface-2 p-6">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-content-secondary">
              Deal Memo ({memo.mode})
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-content-primary whitespace-pre-wrap">{memo.memo}</p>
            {memo.boardroom_verdict && (
              <div className="mt-6 border-t border-edge pt-4">
                <h3 className="font-mono text-[11px] uppercase text-accent-amber">Boardroom Verdict</h3>
                <p className="mt-2 text-sm text-content-secondary">{memo.boardroom_verdict}</p>
              </div>
            )}
          </section>
        )}

        {/* ═══ 9. Corporate Intelligence ═══ */}
        <section className="mt-6 rounded-xl border border-edge bg-bg-surface-2 p-6">
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-content-secondary">
            Corporate Intelligence
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
            <DossierStat label="Owner" value={building.owner_name || "—"} />
            <DossierStat label="Corporate Parent" value={building.corporate_parent || "—"} />
            <DossierStat label="Ticker" value={building.ticker || "—"} />
            <DossierStat label="ESG Score" value={building.esg_score.toFixed(1)} />
            <DossierStat label="Water Mentions (10-K)" value={String(building.water_mentions)} />
            <DossierStat label="LEED" value={building.leed_certified ? building.leed_level || "Certified" : "None"} />
          </div>
        </section>

        {/* ═══ 10. Human-in-the-Loop Approval ═══ */}
        <section className="mt-8 rounded-xl border-2 border-dashed border-accent-amber/30 bg-bg-surface-2 p-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔐</span>
            <div>
              <h2 className="font-display text-lg font-semibold text-content-primary">Send This Dossier to Prospect</h2>
              <p className="text-xs text-content-secondary">
                Auth0 AI Agent approval required before any outbound action
              </p>
            </div>
          </div>
          {sent ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 rounded-lg bg-accent-green/10 border border-accent-green/30 p-3 text-sm text-accent-green"
            >
              {sent}
            </motion.div>
          ) : (
            <ApprovalGate
              buildingName={building.name}
              recipientEmail="facilities@example.com"
              recipientName="Facilities Director"
              emailSubject={`RainUSE Nexus Intelligence Dossier: ${building.name}`}
              emailPreview={
                memo?.memo?.slice(0, 200) ||
                `Complete water reuse intelligence package for ${building.name} including satellite evidence, financial model, and incentive analysis.`
              }
              onApprove={async () => {
                const r = await apiJson<{ success: boolean; message: string }>(
                  `/api/dealroom/${id}/send`,
                  {
                    method: "POST",
                    body: JSON.stringify({
                      recipient_email: "facilities@example.com",
                      recipient_name: "Facilities Director",
                    }),
                  },
                );
                setSent(r.message || "Dossier sent successfully.");
              }}
              onReject={() => setSent("Action declined and logged.")}
              trigger={
                <button
                  type="button"
                  className="mt-4 rounded-lg bg-accent-amber px-6 py-3 font-semibold text-bg-primary text-sm shadow-[0_0_12px_rgba(245,166,35,0.3)] hover:shadow-[0_0_20px_rgba(245,166,35,0.4)] transition-all"
                >
                  Send to Prospect →
                </button>
              }
            />
          )}
        </section>

        <div className="mt-8 text-center text-[10px] text-content-secondary/40 font-mono uppercase tracking-widest">
          RainUSE Nexus · Secure Dealroom · Confidential
        </div>
      </main>
    </div>
  );
}
