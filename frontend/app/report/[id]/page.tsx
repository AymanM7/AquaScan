"use client";

import useSWR from "swr";

import { AppNav } from "@/components/shared/AppNav";
import { BuildingSummary } from "@/components/report/BuildingSummary";
import { ContactCard } from "@/components/report/ContactCard";
import { OwnershipTable } from "@/components/report/OwnershipTable";
import { OutreachScripts } from "@/components/report/OutreachScripts";
import { ReportHeader } from "@/components/report/ReportHeader";
import { ScoreRationale } from "@/components/report/ScoreRationale";
import { swrFetcher } from "@/lib/api";
import type { AutomationReportDetail } from "@/types/report";

export default function ReportDetailPage({ params }: { params: { id: string } }) {
  const { data, error, isLoading } = useSWR<AutomationReportDetail>(
    `/api/report/${params.id}`,
    swrFetcher,
  );

  return (
    <div className="min-h-screen bg-bg-primary">
      <AppNav />
      <main className="report-page mx-auto max-w-5xl space-y-8 px-4 py-8">
        {isLoading ? (
          <p className="text-content-secondary">Loading dossier…</p>
        ) : error || !data ? (
          <p className="text-accent-coral">Report unavailable.</p>
        ) : (
          <>
            <ReportHeader report={data} />
            {data.recent_news || data.esg_commitments ? (
              <section className="grid gap-4 md:grid-cols-2">
                {data.recent_news ? (
                  <div className="rounded-xl border border-edge bg-bg-surface-2 p-4 text-sm text-content-secondary">
                    <h3 className="font-mono text-[10px] uppercase text-content-mono">Recent news</h3>
                    <p className="mt-2">{data.recent_news}</p>
                  </div>
                ) : null}
                {data.esg_commitments ? (
                  <div className="rounded-xl border border-edge bg-bg-surface-2 p-4 text-sm text-content-secondary">
                    <h3 className="font-mono text-[10px] uppercase text-content-mono">ESG commitments</h3>
                    <p className="mt-2">{data.esg_commitments}</p>
                  </div>
                ) : null}
              </section>
            ) : null}
            <OwnershipTable rows={data.ownership} />
            <div className="grid gap-8 lg:grid-cols-2">
              <ContactCard contact={data.contact} />
              <BuildingSummary report={data} />
            </div>
            <OutreachScripts report={data} />
            <ScoreRationale report={data} />
          </>
        )}
      </main>
    </div>
  );
}
