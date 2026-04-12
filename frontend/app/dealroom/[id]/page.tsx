"use client";

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

export default function DealroomPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data: building } = useSWR<BuildingDetail>(id ? `/api/building/${id}` : null, swrFetcher);
  const { data: memo } = useSWR<MemoPayload>(
    id ? `/api/dealroom/${id}/cached-memo` : null,
    swrFetcher,
  );
  const [sent, setSent] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-bg-primary">
      <AppNav />
      <main className="mx-auto max-w-[900px] px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/map" className="text-sm text-accent-teal hover:underline">
            ← Back to map
          </Link>
        </div>
        {!building ? (
          <p className="text-content-secondary">Loading dealroom…</p>
        ) : (
          <>
            <header className="mb-10 border-b border-edge pb-8">
              <h1 className="font-display text-3xl text-content-primary">{building.name}</h1>
              <p className="mt-2 text-content-secondary">
                {building.address}, {building.city}, {building.state}
              </p>
            </header>
            <section className="mb-10 rounded-xl border border-edge bg-bg-surface-2 p-6">
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-content-secondary">
                Satellite evidence
              </h2>
              {building.raw_chip_url ? (
                // Satellite chips are arbitrary URLs from seed / CV — use native img.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={building.raw_chip_url}
                  alt="Roof satellite chip"
                  className="mt-4 max-h-80 w-full rounded-lg border border-edge object-cover"
                />
              ) : (
                <p className="mt-4 text-sm text-content-secondary">No public chip URL on file.</p>
              )}
            </section>
            <section className="mb-10 rounded-xl border border-edge bg-bg-surface-2 p-6">
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-content-secondary">
                Water twin snapshot
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  ["Annual capture", `${(building.annual_gallons / 1e6).toFixed(2)}M gal`],
                  ["Payback", `${building.payback_years.toFixed(1)} yr`],
                  ["IRR", `${building.irr_pct.toFixed(1)}%`],
                  ["NPV 20yr", `$${(building.npv_20yr / 1e6).toFixed(2)}M`],
                  ["Annual savings", `$${Math.round(building.annual_savings_usd).toLocaleString()}`],
                  ["Stormwater avoidance", `$${Math.round(building.stormwater_fee_avoidance).toLocaleString()}/yr`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-edge bg-bg-surface px-3 py-2">
                    <p className="font-mono text-[10px] uppercase text-accent-teal">{k}</p>
                    <p className="font-mono text-sm text-content-primary">{v}</p>
                  </div>
                ))}
              </div>
            </section>
            {memo ? (
              <section className="mb-10 rounded-xl border border-edge bg-bg-surface-2 p-6">
                <h2 className="font-mono text-[11px] uppercase text-content-secondary">
                  Executive memo ({memo.mode})
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-content-primary">{memo.memo}</p>
                {memo.boardroom_verdict ? (
                  <div className="mt-6 border-t border-edge pt-6">
                    <h3 className="font-display text-lg text-accent-amber">Boardroom synthesis</h3>
                    <p className="mt-2 text-sm text-content-secondary">{memo.boardroom_verdict}</p>
                  </div>
                ) : null}
              </section>
            ) : null}
            <section className="rounded-xl border border-edge-active bg-bg-surface-2 p-6">
              <h2 className="font-display text-lg text-content-primary">Human in the loop</h2>
              <p className="mt-2 text-sm text-content-secondary">
                Approve before any outbound send. This demo logs intent only.
              </p>
              {sent ? (
                <p className="mt-4 text-sm text-accent-green">{sent}</p>
              ) : (
                <ApprovalGate
                  buildingName={building.name}
                  recipientEmail="facilities@example.com"
                  recipientName="Facilities Director"
                  emailSubject={`RainUSE dossier: ${building.name}`}
                  emailPreview={(memo?.memo ?? "").slice(0, 140)}
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
                    setSent(r.message);
                  }}
                  onReject={() => setSent("Send cancelled.")}
                  trigger={
                    <button
                      type="button"
                      className="mt-4 rounded-lg bg-accent-amber px-4 py-2 font-display text-sm font-semibold text-bg-primary"
                    >
                      Send dossier to prospect
                    </button>
                  }
                />
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
