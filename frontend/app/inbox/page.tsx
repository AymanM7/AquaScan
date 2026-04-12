"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import useSWR from "swr";

import { AppNav } from "@/components/shared/AppNav";
import { apiJson, swrFetcher } from "@/lib/api";
import { DEMO_REP_ID } from "@/lib/demoMode";
import type { InboxNotificationItem } from "@/types/inbox";

type InboxResponse = { data: InboxNotificationItem[]; count: number };

export default function InboxPage() {
  const [sort, setSort] = useState<"newest" | "highest_score" | "unread_first">("newest");
  const key = `/api/inbox?rep_id=${encodeURIComponent(DEMO_REP_ID)}&sort=${sort}`;
  const { data, mutate, isLoading } = useSWR<InboxResponse>(key, swrFetcher);

  const markRead = useCallback(
    async (id: string) => {
      await apiJson(`/api/inbox/${id}/read`, { method: "POST" });
      void mutate();
    },
    [mutate],
  );

  const markAll = async () => {
    await apiJson(`/api/inbox/mark-all-read?rep_id=${encodeURIComponent(DEMO_REP_ID)}`, {
      method: "POST",
    });
    void mutate();
  };

  const items = data?.data ?? [];

  return (
    <div className="min-h-screen bg-bg-primary">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-edge pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl text-content-primary">Rep inbox</h1>
            <p className="mt-1 text-sm text-content-secondary">
              Routed automation reports for <span className="text-accent-teal">{DEMO_REP_ID}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-lg border border-edge bg-bg-surface-2 px-3 py-2 text-sm text-content-primary"
            >
              <option value="newest">Newest</option>
              <option value="highest_score">Highest score</option>
              <option value="unread_first">Unread first</option>
            </select>
            <button
              type="button"
              onClick={() => void markAll()}
              className="rounded-lg border border-edge-active px-3 py-2 text-sm text-accent-teal"
            >
              Mark all read
            </button>
          </div>
        </header>
        {isLoading ? <p className="text-content-secondary">Loading…</p> : null}
        {!isLoading && items.length === 0 ? (
          <div className="rounded-xl border border-edge bg-bg-surface-2 p-12 text-center text-content-secondary">
            <p>When buildings cross your threshold, full intelligence reports appear here.</p>
          </div>
        ) : null}
        <ul className="space-y-3">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => void markRead(n.id)}
                className={`w-full rounded-xl border border-edge bg-bg-surface-2 p-4 text-left transition hover:border-edge-active ${
                  !n.read_at ? "border-l-4 border-l-accent-teal shadow-teal-glow" : "border-l-4 border-l-edge"
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
                  <div>
                    <h2 className="font-display text-lg text-content-primary">{n.building_name}</h2>
                    <p className="text-sm text-content-secondary">{n.building_address}</p>
                  </div>
                  <div className="flex flex-col gap-2 lg:items-end">
                    <span className="w-fit rounded-full bg-accent-amber/15 px-2 py-1 font-mono text-xs text-accent-amber">
                      Score {n.score_at_trigger.toFixed(0)} · threshold {n.threshold}
                    </span>
                    <span className="font-mono text-xs text-content-mono">{n.genome_archetype}</span>
                    {n.contact_name ? (
                      <p className="text-xs text-content-secondary">
                        {n.contact_name}
                        {n.contact_title ? ` · ${n.contact_title}` : ""}
                        {n.contact_company ? ` · ${n.contact_company}` : ""}
                      </p>
                    ) : null}
                    <p className="text-[11px] text-content-secondary">
                      {n.run_label}
                      {n.run_at ? ` · ${new Date(n.run_at).toLocaleString()}` : ""}
                    </p>
                    <Link
                      href={`/report/${n.report_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-semibold text-accent-teal hover:underline"
                    >
                      View full report →
                    </Link>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
