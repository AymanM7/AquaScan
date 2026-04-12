"use client";

import { useAuth0 } from "@auth0/auth0-react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AppNav } from "@/components/shared/AppNav";
import { apiJson } from "@/lib/api";
import { setOnboardingCookieClient } from "@/lib/onboarding-cookie";

type SettingsPayload = {
  territory: string;
  cadence: string;
  score_threshold: number;
  onboarding_complete: boolean;
  rep_zip?: string | null;
  notification_email?: boolean | null;
  voice_model?: string | null;
};

export default function OnboardingPage() {
  const { user, isAuthenticated, loginWithRedirect } = useAuth0();
  const router = useRouter();
  const userId = user?.sub ?? "demo-local-user";

  const [step, setStep] = useState(0);
  const [territory, setTerritory] = useState("DFW");
  const [cadence, setCadence] = useState("weekly");
  const [threshold, setThreshold] = useState(75);
  const [voice, setVoice] = useState<"rachel" | "adam">("rachel");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(
    () => ["Territory", "Cadence & voice", "Activation threshold"][step],
    [step],
  );

  const finish = async () => {
    setSaving(true);
    setError(null);
    const body: SettingsPayload = {
      territory,
      cadence,
      score_threshold: threshold,
      onboarding_complete: true,
      notification_email: true,
      voice_model: voice,
    };
    try {
      await apiJson(`/api/settings/${encodeURIComponent(userId)}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setOnboardingCookieClient();
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.65 } });
      router.push("/map");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-content-primary">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-10">
        {!isAuthenticated && (
          <div className="mb-6 rounded-lg border border-edge bg-bg-surface/80 p-4 text-sm text-content-secondary">
            You can continue as a <span className="font-mono text-content-mono">demo-local-user</span>{" "}
            without Auth0, or{" "}
            <button
              type="button"
              className="text-accent-teal underline-offset-2 hover:underline"
              onClick={() => loginWithRedirect()}
            >
              log in
            </button>{" "}
            to align with <code className="font-mono">PHASE_03_LANDING_ONBOARDING.md</code>.
          </div>
        )}

        <div className="mb-2 font-mono text-xs uppercase tracking-widest text-accent-teal">
          Onboarding · step {step + 1} / 3
        </div>
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-content-secondary">
          Mirrors the three-step wizard in{" "}
          <code className="font-mono text-xs text-content-mono">PHASE_03_LANDING_ONBOARDING.md</code>.
        </p>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          className="mt-8 space-y-6 rounded-xl border border-edge bg-bg-surface/80 p-6 backdrop-blur"
        >
          {step === 0 && (
            <div className="space-y-3">
              <label className="block text-sm text-content-secondary">
                Territory focus
                <select
                  className="mt-1 w-full rounded-md border border-edge bg-bg-primary px-3 py-2 text-content-primary"
                  value={territory}
                  onChange={(e) => setTerritory(e.target.value)}
                >
                  <option value="DFW">Dallas–Fort Worth</option>
                  <option value="AUS">Austin metro</option>
                  <option value="HOU">Houston ship channel</option>
                </select>
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <label className="block text-sm text-content-secondary">
                Scan cadence
                <select
                  className="mt-1 w-full rounded-md border border-edge bg-bg-primary px-3 py-2 text-content-primary"
                  value={cadence}
                  onChange={(e) => setCadence(e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label className="block text-sm text-content-secondary">
                Voice model for debrief audio
                <select
                  className="mt-1 w-full rounded-md border border-edge bg-bg-primary px-3 py-2 text-content-primary"
                  value={voice}
                  onChange={(e) => setVoice(e.target.value as "rachel" | "adam")}
                >
                  <option value="rachel">Rachel (default)</option>
                  <option value="adam">Adam</option>
                </select>
              </label>
            </div>
          )}

          {step === 2 && (
            <div>
              <label className="block text-sm text-content-secondary">
                Crossing threshold (0–100)
                <input
                  type="range"
                  min={50}
                  max={95}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="mt-3 w-full accent-accent-teal"
                />
                <div className="mt-2 font-mono text-2xl text-accent-teal">{threshold}</div>
              </label>
              <p className="mt-3 text-xs text-content-secondary">
                Automation uses this gate when evaluating score crossings (see{" "}
                <code className="font-mono">PHASE_07_AUTOMATION_ENGINE.md</code>).
              </p>
            </div>
          )}

          {error && <div className="rounded-md border border-accent-coral/40 bg-bg-surface-2 p-3 text-sm text-accent-coral">{error}</div>}

          <div className="flex justify-between gap-3">
            <button
              type="button"
              className="rounded-md border border-edge px-4 py-2 text-sm hover:border-edge-active"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </button>
            {step < 2 ? (
              <button
                type="button"
                className="rounded-md bg-accent-teal px-4 py-2 text-sm font-semibold text-bg-primary"
                onClick={() => setStep((s) => s + 1)}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                className="rounded-md bg-accent-teal px-4 py-2 text-sm font-semibold text-bg-primary disabled:opacity-50"
                onClick={() => void finish()}
              >
                {saving ? "Saving…" : "Activate RainUSE"}
              </button>
            )}
          </div>
        </motion.div>

        <p className="mt-6 text-center text-xs text-content-secondary">
          Need the cinematic landing first?{" "}
          <Link href="/" className="text-accent-teal underline-offset-2 hover:underline">
            Return home
          </Link>
        </p>
      </main>
    </div>
  );
}
