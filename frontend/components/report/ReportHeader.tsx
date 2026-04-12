"use client";

import type { AutomationReportDetail } from "@/types/report";

export function ReportHeader({ report }: { report: AutomationReportDetail }) {
  return (
    <header className="relative overflow-hidden rounded-xl border border-edge bg-bg-surface-2 p-8">
      <div
        className="pointer-events-none absolute -right-8 -top-12 rotate-[-18deg] font-display text-[120px] font-bold uppercase leading-none text-content-primary/[0.03]"
        aria-hidden
      >
        Intelligence
      </div>
      <h1 className="font-display text-3xl font-bold text-content-primary">{report.building_name}</h1>
      <p className="mt-1 text-sm text-content-secondary">{report.building_address}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-accent-amber/50 bg-accent-amber/10 px-3 py-1 font-mono text-xs text-accent-amber">
          Triggered at score {Math.round(report.score_at_trigger)}
        </span>
        <span className="rounded-full border border-edge px-3 py-1 font-mono text-xs text-content-mono">
          {report.genome_archetype}
        </span>
        <span className="text-xs text-content-secondary">
          {report.run_at
            ? `Generated · ${new Date(report.run_at).toLocaleString()}`
            : "Run timestamp pending"}
        </span>
      </div>
    </header>
  );
}
