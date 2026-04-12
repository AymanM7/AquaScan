"use client";

import { useAuth0 } from "@auth0/auth0-react";
import useSWR from "swr";

import { AppNav } from "@/components/shared/AppNav";
import { useAutomationRun } from "@/hooks/useAutomationRun";
import { apiJson } from "@/lib/api";

type RunRow = {
  id: string;
  run_at: string | null;
  buildings_scanned: number | null;
  crossings_count: number | null;
  reports_dispatched: number | null;
  status: string | null;
};

type ReportRow = {
  id: string;
  building_name: string;
  building_address: string;
  score_at_trigger: number | null;
  genome_archetype: string | null;
};

const fetchRuns = (userId: string) => apiJson<{ data: RunRow[] }>(`/api/automation/runs?user_id=${encodeURIComponent(userId)}`);
const fetchReports = (userId: string) =>
  apiJson<{ data: ReportRow[] }>(`/api/automation/reports?user_id=${encodeURIComponent(userId)}`);

export default function AutomationPage() {
  const { user, isAuthenticated, loginWithRedirect } = useAuth0();
  const userId = user?.sub ?? "demo-local-user";
  const { data: runs, mutate: mutateRuns } = useSWR(["automation-runs", userId], () => fetchRuns(userId), {
    refreshInterval: 30_000,
  });
  const { data: reports, mutate: mutateReports } = useSWR(
    ["automation-reports", userId],
    () => fetchReports(userId),
    { refreshInterval: 30_000 },
  );
  const { status, error, trigger } = useAutomationRun();

  return (
    <div className="min-h-screen bg-bg-primary text-content-primary">
      <AppNav />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div>
          <h1 className="font-display text-3xl font-semibold">Automation intelligence</h1>
          <p className="mt-2 max-w-3xl text-sm text-content-secondary">
            Surfaces Celery-backed territory scans from{" "}
            <code className="font-mono text-xs text-content-mono">PHASE_07_AUTOMATION_ENGINE.md</code>. Run
            the worker + Redis stack so tasks leave <span className="font-mono">PENDING</span>.
          </p>
        </div>

        {!isAuthenticated && (
          <div className="rounded-lg border border-edge bg-bg-surface/80 p-4 text-sm text-content-secondary">
            Optional Auth0 — continue as <span className="font-mono text-content-mono">demo-local-user</span>{" "}
            or{" "}
            <button
              type="button"
              className="text-accent-teal underline-offset-2 hover:underline"
              onClick={() => loginWithRedirect()}
            >
              log in
            </button>
            .
          </div>
        )}

        <section className="flex flex-wrap items-center gap-3 rounded-xl border border-edge bg-bg-surface/80 p-4">
          <button
            type="button"
            className="rounded-md bg-accent-teal px-4 py-2 text-sm font-semibold text-bg-primary"
            onClick={async () => {
              await trigger(userId, true);
              await mutateRuns();
              await mutateReports();
            }}
          >
            Run territory scan (demo mode)
          </button>
          <button
            type="button"
            className="rounded-md border border-edge px-4 py-2 text-sm hover:border-edge-active"
            onClick={async () => {
              await trigger(userId, false);
              await mutateRuns();
            }}
          >
            Full scan (requires worker)
          </button>
          {status && (
            <span className="text-xs text-content-secondary">
              Task status: <span className="font-mono text-content-mono">{status}</span>
            </span>
          )}
          {error && <span className="text-xs text-accent-coral">{error}</span>}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-edge bg-bg-surface/80 p-4">
            <h2 className="font-display text-lg font-semibold">Recent runs</h2>
            <div className="mt-3 space-y-2 text-sm">
              {(runs?.data ?? []).map((r) => (
                <div key={r.id} className="rounded-lg border border-edge bg-bg-primary/60 p-3">
                  <div className="flex justify-between text-xs text-content-secondary">
                    <span>{r.run_at ?? "—"}</span>
                    <span className="font-mono text-accent-teal">{r.status}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-content-secondary">
                    <div>Scanned: {r.buildings_scanned ?? "—"}</div>
                    <div>Crossings: {r.crossings_count ?? "—"}</div>
                    <div>Reports: {r.reports_dispatched ?? "—"}</div>
                  </div>
                </div>
              ))}
              {!runs?.data?.length && (
                <p className="text-xs text-content-secondary">No runs yet — trigger a demo scan.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-edge bg-bg-surface/80 p-4">
            <h2 className="font-display text-lg font-semibold">Crossing reports</h2>
            <div className="mt-3 space-y-2 text-sm">
              {(reports?.data ?? []).map((rep) => (
                <div key={rep.id} className="rounded-lg border border-edge bg-bg-primary/60 p-3">
                  <div className="font-semibold">{rep.building_name}</div>
                  <div className="text-xs text-content-secondary">{rep.building_address}</div>
                  <div className="mt-2 text-xs text-content-secondary">
                    Trigger score {rep.score_at_trigger ?? "—"} · {rep.genome_archetype}
                  </div>
                </div>
              ))}
              {!reports?.data?.length && (
                <p className="text-xs text-content-secondary">No crossing reports yet.</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
