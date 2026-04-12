"use client";

import useSWR from "swr";

import { apiJson } from "@/lib/api";
import type { AlertEvent } from "@/types/building";

type AlertList = { data: AlertEvent[] };

const fetcher = (path: string) => apiJson<AlertList>(path);

export function AlertTicker({ state }: { state: string }) {
  const { data } = useSWR(`/api/alerts?state=${state}&limit=25`, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });
  const items = data?.data ?? [];
  if (!items.length) {
    return (
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 border-b border-edge bg-bg-surface/80 px-4 py-2 text-center text-xs text-content-secondary backdrop-blur">
        No live alerts yet — seed data or wait for automation runs (
        <code className="font-mono">PHASE_07_AUTOMATION_ENGINE.md</code>).
      </div>
    );
  }
  const text = items
    .map((a) => `${a.city || a.state} · ${a.description ?? ""} (${a.type})`)
    .join("   •   ");
  const band = (
    <>
      <span className="font-mono text-accent-teal">LIVE</span> {text}
    </>
  );
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 overflow-hidden border-b border-edge bg-bg-surface/85 py-2 text-xs text-content-primary backdrop-blur">
      <div className="flex w-max animate-marquee whitespace-nowrap">
        <span className="px-8">{band}</span>
        <span className="px-8">{band}</span>
      </div>
    </div>
  );
}
