"use client";

import type { AutomationReportDetail } from "@/types/report";

export function BuildingSummary({ report }: { report: AutomationReportDetail }) {
  const items = [
    { label: "Roof area", value: `${report.roof_sqft.toLocaleString()} sqft` },
    {
      label: "Cooling tower status",
      value: report.ct_detected ? "Detected" : "Not flagged",
    },
    {
      label: "Annual capture",
      value: `${(report.annual_gallons / 1e6).toFixed(2)}M gal`,
    },
    { label: "Payback estimate", value: `${report.payback_years.toFixed(1)} years` },
    { label: "Active drought", value: report.drought_label },
    { label: "Applicable incentive", value: report.applicable_incentives },
  ];
  return (
    <section className="rounded-xl border border-edge bg-bg-surface-2 p-6">
      <h2 className="font-mono text-[11px] uppercase tracking-widest text-content-secondary">
        Building intelligence
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-lg border border-edge bg-bg-surface px-4 py-3"
          >
            <p className="font-mono text-[10px] uppercase tracking-wide text-accent-teal">{it.label}</p>
            <p className="mt-1 font-mono text-sm text-content-primary">{it.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
