"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { AppNav } from "@/components/shared/AppNav";
import { swrFetcher } from "@/lib/api";
import { DEMO_MODE } from "@/lib/demoMode";
import type { AlertEvent } from "@/types/building";

type AlertListResponse = { data: AlertEvent[]; count: number };

const FEED_TYPES = [
  { id: "all", label: "All", icon: "🌐", color: "#7A95B0" },
  { id: "drought", label: "Drought", icon: "🔴", color: "#FB7185" },
  { id: "rate", label: "Rate", icon: "🟡", color: "#F5A623" },
  { id: "incentive", label: "Incentive", icon: "🟢", color: "#4ADE80" },
  { id: "sec", label: "SEC", icon: "📄", color: "#A78BFA" },
  { id: "ordinance", label: "Regulation", icon: "⚖️", color: "#60A5FA" },
] as const;

const TYPE_COLORS: Record<string, string> = {
  drought: "#FB7185",
  rate: "#F5A623",
  incentive: "#4ADE80",
  sec: "#A78BFA",
  ordinance: "#60A5FA",
};

export default function FeedPage() {
  const [activeType, setActiveType] = useState<(typeof FEED_TYPES)[number]["id"]>("all");
  const [activeState, setActiveState] = useState<string>("ALL");
  const [injected, setInjected] = useState<AlertEvent[]>([]);
  const [banner, setBanner] = useState<string | null>(null);

  const { data, mutate } = useSWR<AlertListResponse>("/api/alerts?limit=120", swrFetcher);

  const injectDemo = useCallback(() => {
    const ev: AlertEvent = {
      id: `live-${Date.now()}`,
      type: "drought",
      state: "TX",
      city: "Dallas",
      building_ids: [],
      score_delta: 2.1,
      description: "Live injection: county drought watch upgraded — scores recomputed in your territory.",
      source: "NWS (simulated)",
      event_timestamp: new Date().toISOString(),
    };
    setInjected((prev) => [ev, ...prev].slice(0, 15));
    setBanner("New intelligence event received");
    setTimeout(() => setBanner(null), 4000);
    void mutate();
  }, [mutate]);

  useEffect(() => {
    if (!DEMO_MODE) return undefined;
    const ms = DEMO_MODE ? 18_000 : 45_000;
    const id = setInterval(() => injectDemo(), ms);
    return () => clearInterval(id);
  }, [injectDemo]);

  const merged = useMemo(() => {
    const base = data?.data ?? [];
    const m = [...injected, ...base];
    const seen = new Set<string>();
    return m.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }, [data, injected]);

  const filtered = useMemo(() => {
    return merged
      .filter((e) => activeType === "all" || e.type === activeType)
      .filter((e) => activeState === "ALL" || e.state === activeState);
  }, [merged, activeType, activeState]);

  return (
    <div className="min-h-screen bg-bg-primary">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl text-content-primary">Opportunity shock feed</h1>
          <span className="inline-flex items-center gap-2 rounded-full border border-edge px-3 py-1 text-xs text-accent-teal">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-teal opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-teal" />
            </span>
            LIVE
          </span>
        </div>
        <p className="text-xs text-content-secondary">
          Last updated: {new Date().toLocaleString()}
          {DEMO_MODE ? " · demo injection enabled" : ""}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {FEED_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveType(t.id)}
              className="rounded-full border px-3 py-1 text-xs font-semibold transition"
              style={{
                borderColor: activeType === t.id ? t.color : "rgba(122,149,176,0.25)",
                backgroundColor: activeType === t.id ? `${t.color}22` : "transparent",
                color: activeType === t.id ? t.color : "var(--color-text-secondary)",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="font-mono text-[10px] uppercase text-content-secondary">State</span>
          <select
            value={activeState}
            onChange={(e) => setActiveState(e.target.value)}
            className="rounded-lg border border-edge bg-bg-surface-2 px-2 py-1 text-content-primary"
          >
            {["ALL", "TX", "PA", "AZ", "CA"].map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All states" : s}
              </option>
            ))}
          </select>
        </div>

        <AnimatePresence>
          {banner ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 rounded-lg border border-accent-teal bg-accent-teal/10 px-4 py-3 text-sm text-accent-teal"
            >
              {banner}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <ul className="mt-8 space-y-4">
          {filtered.map((e) => (
            <EventCard key={e.id} event={e} isNew={injected.some((x) => x.id === e.id)} />
          ))}
        </ul>
      </main>
    </div>
  );
}

function EventCard({ event, isNew }: { event: AlertEvent; isNew?: boolean }) {
  const color = TYPE_COLORS[event.type] || "#7A95B0";
  const desc = event.description ?? "";
  const headline = desc.length > 90 ? `${desc.slice(0, 90)}…` : desc;
  return (
    <motion.li
      layout
      initial={isNew ? { y: -24, opacity: 0 } : false}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      className={`overflow-hidden rounded-xl border border-edge bg-bg-surface-2 ${
        isNew ? "ring-1 ring-accent-teal/50" : ""
      }`}
    >
      <div className="flex">
        <div className="w-1 shrink-0" style={{ background: color }} />
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase text-content-secondary">
            <span style={{ color }}>{event.type}</span>
            <span>
              {event.city}, {event.state}
            </span>
            <span className="font-mono text-content-mono">
              Δ score {event.score_delta != null ? `+${event.score_delta.toFixed(1)}` : "—"}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-content-primary">{headline}</p>
          <p className="mt-1 text-xs text-content-secondary">
            Source: {event.source} · {new Date(event.event_timestamp).toLocaleString()}
          </p>
          {event.building_ids?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {event.building_ids.slice(0, 4).map((id) => (
                <Link
                  key={id}
                  href={`/map?focus=${id}`}
                  className="text-xs text-accent-teal hover:underline"
                >
                  Building {id.slice(0, 8)}…
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </motion.li>
  );
}
