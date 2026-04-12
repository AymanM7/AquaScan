"use client";

import type { OwnershipRow } from "@/types/report";

const CONF: Record<string, { dot: string; label: string }> = {
  high: { dot: "#4ADE80", label: "High — verified public record" },
  medium: { dot: "#F5A623", label: "Medium — multiple sources" },
  low: { dot: "#FB7185", label: "Low — single source / unverified" },
};

export function OwnershipTable({ rows }: { rows: OwnershipRow[] }) {
  return (
    <section className="rounded-xl border border-edge border-t-2 border-t-accent-teal bg-bg-surface-2 p-6 pt-5">
      <h2 className="font-mono text-[11px] uppercase tracking-widest text-content-secondary">
        Ownership intelligence
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-edge text-[11px] uppercase text-content-secondary">
              <th className="pb-2 font-mono">Field</th>
              <th className="pb-2 font-mono">Value</th>
              <th className="pb-2 font-mono">Confidence</th>
              <th className="pb-2 font-mono">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const c = CONF[r.confidence] || CONF.low;
              return (
                <tr
                  key={`${r.field}-${i}`}
                  className={i % 2 === 0 ? "bg-bg-surface/40" : ""}
                >
                  <td className="py-2 pr-4 text-content-secondary">{r.field}</td>
                  <td className="py-2 pr-4 text-content-primary">{r.value}</td>
                  <td className="py-2 pr-4">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: c.dot }}
                        title={c.label}
                      />
                      <span className="text-xs capitalize text-content-secondary">{r.confidence}</span>
                    </span>
                  </td>
                  <td className="py-2 text-xs text-content-mono">{r.source || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
