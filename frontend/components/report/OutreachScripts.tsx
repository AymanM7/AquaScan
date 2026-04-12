"use client";

import { useState } from "react";

import type { AutomationReportDetail } from "@/types/report";

const TABS = ["Cold Email", "LinkedIn", "Phone"] as const;

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}

export function OutreachScripts({ report }: { report: AutomationReportDetail }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Cold Email");
  const s = report.outreach_scripts;

  return (
    <section className="rounded-xl border border-edge bg-bg-surface-2 p-6">
      <h2 className="font-mono text-[11px] uppercase tracking-widest text-content-secondary">
        Outreach pipeline
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              tab === t
                ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                : "border-edge text-content-secondary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-edge bg-bg-surface p-4 font-mono text-sm leading-relaxed text-content-primary">
        {tab === "Cold Email" ? (
          <>
            {s.cold_email.subject ? (
              <div className="mb-3 border-b border-edge pb-3">
                <p className="text-[10px] uppercase text-content-secondary">Subject</p>
                <p>{s.cold_email.subject}</p>
                <button
                  type="button"
                  className="mt-2 text-xs text-accent-teal"
                  onClick={() => void copy(s.cold_email.subject)}
                >
                  Copy subject
                </button>
              </div>
            ) : null}
            <p className="whitespace-pre-wrap">{s.cold_email.body}</p>
            <button
              type="button"
              className="mt-3 text-xs text-accent-teal"
              onClick={() => void copy(`${s.cold_email.subject}\n\n${s.cold_email.body}`)}
            >
              Copy full email
            </button>
          </>
        ) : null}
        {tab === "LinkedIn" ? (
          <>
            <p className="whitespace-pre-wrap">{s.linkedin}</p>
            <button
              type="button"
              className="mt-3 text-xs text-accent-teal"
              onClick={() => void copy(s.linkedin)}
            >
              Copy script
            </button>
          </>
        ) : null}
        {tab === "Phone" ? (
          <>
            <p className="text-xs text-content-secondary">~90 second opener</p>
            <p className="mt-2 whitespace-pre-wrap">{s.phone}</p>
            <button
              type="button"
              className="mt-3 text-xs text-accent-teal"
              onClick={() => void copy(s.phone)}
            >
              Copy script
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
