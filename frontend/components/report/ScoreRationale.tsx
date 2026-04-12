"use client";

import type { AutomationReportDetail } from "@/types/report";

export function ScoreRationale({ report }: { report: AutomationReportDetail }) {
  const r = report.score_rationale;
  return (
    <section className="rounded-xl border border-edge border-t-2 border-t-accent-amber bg-bg-surface-2 p-6 pt-5">
      <h2 className="font-display text-lg text-content-primary">Why this building crossed</h2>
      <p className="mt-2 text-sm text-content-secondary">{r.overall_line}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-edge text-[11px] uppercase text-content-secondary">
              <th className="pb-2 font-mono">Pillar</th>
              <th className="pb-2 font-mono">Score</th>
              <th className="pb-2 font-mono">Notes</th>
            </tr>
          </thead>
          <tbody>
            {r.pillars.map((p) => (
              <tr key={p.label} className="border-b border-edge/60">
                <td className="py-2 text-content-secondary">{p.label}</td>
                <td className="py-2 font-mono text-content-mono">
                  {p.score.toFixed(1)} / {p.max_points.toFixed(0)}
                </td>
                <td className="py-2 text-content-primary">{p.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-content-secondary">
        {r.why_now.map((w) => (
          <li key={w.label}>
            <span className="mr-2">{w.icon}</span>
            <strong className="text-content-primary">{w.label}</strong> (+{w.points.toFixed(1)} pts) —{" "}
            {w.timing}
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-edge pt-4 text-sm italic text-content-secondary">
        {r.counterfactual_line}
      </p>
    </section>
  );
}
