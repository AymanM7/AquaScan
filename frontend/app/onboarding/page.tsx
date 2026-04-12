"use client";

import { useAuth0 } from "@auth0/auth0-react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";

import { RainParticleOverlay } from "@/components/map/RainParticleOverlay";
import { apiJson } from "@/lib/api";
import { setOnboardingCookieClient } from "@/lib/onboarding-cookie";

type SettingsPayload = {
  territory: string;
  cadence: string;
  score_threshold: number;
  onboarding_complete: boolean;
  voice_model: string;
};

const TERRITORIES = [
  { id: "DFW", label: "Dallas–Fort Worth", active: true },
  { id: "AUS", label: "Austin Metro", active: false },
  { id: "HOU", label: "Houston", active: false },
  { id: "SA", label: "San Antonio", active: false },
  { id: "PHX", label: "Phoenix", active: false },
  { id: "PHL", label: "Philadelphia", active: false },
];

const CADENCES = [
  { id: "daily", label: "Daily", icon: "🌅", desc: "Best for active territories. Catches threshold crossings within 24 hours." },
  { id: "weekly", label: "Weekly", icon: "📆", desc: "Balanced cadence. Recommended for most sales teams." },
  { id: "biweekly", label: "Bi-Weekly", icon: "🗓️", desc: "Lower volume. Best when combined with a high score threshold." },
];

const PRESETS = [
  { label: "Conservative", value: 90 },
  { label: "Balanced", value: 75 },
  { label: "Aggressive", value: 60 },
];

function getEstimatedCount(threshold: number): { buildings: number; reports: string } {
  if (threshold >= 90) return { buildings: 5, reports: "0–1 per week" };
  if (threshold >= 85) return { buildings: 12, reports: "1–2 per week" };
  if (threshold >= 80) return { buildings: 18, reports: "2–4 per week" };
  if (threshold >= 75) return { buildings: 28, reports: "3–6 per week" };
  if (threshold >= 70) return { buildings: 38, reports: "5–8 per week" };
  if (threshold >= 65) return { buildings: 47, reports: "6–10 per week" };
  return { buildings: 55, reports: "8–15 per week" };
}

export default function OnboardingPage() {
  const { user, isAuthenticated, loginWithRedirect } = useAuth0();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = user?.sub ?? "demo-local-user";

  // If already onboarded, skip straight to map
  useEffect(() => {
    if (typeof document !== "undefined") {
      const already = document.cookie.split(";").some((c) => c.trim().startsWith("rainuse_onboarding=1"));
      if (already) {
        const next = searchParams?.get("next") || "/map";
        router.replace(next);
      }
    }
  }, [router, searchParams]);

  const [step, setStep] = useState(0);
  const [territory, setTerritory] = useState("DFW");
  const [cadence, setCadence] = useState("weekly");
  const [threshold, setThreshold] = useState(75);
  const [voice, setVoice] = useState<"rachel" | "adam">("rachel");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  const est = useMemo(() => getEstimatedCount(threshold), [threshold]);

  const finish = async () => {
    setSaving(true);
    setError(null);
    setActivating(true);
    const body: SettingsPayload = {
      territory,
      cadence,
      score_threshold: threshold,
      onboarding_complete: true,
      voice_model: voice,
    };
    try {
      await apiJson(`/api/settings/${encodeURIComponent(userId)}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setOnboardingCookieClient();
      // Particle burst
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#00E5CC", "#0EA5E9", "#60A5FA", "#34D399"],
      });
      await new Promise((r) => setTimeout(r, 1800));
      // Redirect to the page they originally tried to visit, or the map
      const destination = searchParams?.get("next") || "/map";
      router.push(destination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings");
      setActivating(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-primary text-content-primary">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#060D1A] via-[#0a1628] to-[#060D1A] blur-sm" />
      <RainParticleOverlay />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          {[0, 1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                  step >= s
                    ? "bg-accent-teal text-bg-primary"
                    : "border border-edge text-content-secondary"
                }`}
              >
                {step > s ? "✓" : s + 1}
              </div>
              {s < 2 && <div className={`h-px w-12 ${step > s ? "bg-accent-teal" : "bg-edge"}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ═══ Step 1: Territory ═══ */}
          {step === 0 && (
            <motion.div
              key="territory"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="w-full max-w-lg rounded-2xl border border-edge/50 bg-bg-surface/60 p-8 backdrop-blur-xl"
            >
              <h2 className="font-display text-2xl font-bold">Select Your Territory</h2>
              <p className="mt-2 text-sm text-content-secondary">
                Your intelligence engine will scan this territory on every automation run.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {TERRITORIES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => t.active && setTerritory(t.id)}
                    disabled={!t.active}
                    className={`relative rounded-xl border p-4 text-left transition-all ${
                      territory === t.id
                        ? "border-accent-teal bg-accent-teal/10 shadow-teal-glow"
                        : t.active
                          ? "border-edge hover:border-edge-active"
                          : "border-edge/30 opacity-40"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${territory === t.id ? "text-accent-teal" : "text-content-primary"}`}>
                      {t.label}
                    </div>
                    {!t.active && (
                      <span className="mt-1 block font-mono text-[9px] uppercase text-content-secondary/60">Coming Soon</span>
                    )}
                    {territory === t.id && (
                      <motion.div
                        layoutId="territory-check"
                        className="absolute right-3 top-3 text-accent-teal"
                      >
                        ✓
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mt-6 w-full rounded-lg bg-accent-teal py-3 text-sm font-semibold text-bg-primary"
                onClick={() => setStep(1)}
              >
                Continue
              </button>
            </motion.div>
          )}

          {/* ═══ Step 2: Cadence & Voice ═══ */}
          {step === 1 && (
            <motion.div
              key="cadence"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="w-full max-w-lg rounded-2xl border border-edge/50 bg-bg-surface/60 p-8 backdrop-blur-xl"
            >
              <h2 className="font-display text-2xl font-bold">Automation Cadence</h2>
              <p className="mt-2 text-sm text-content-secondary">
                How often should the engine scan your territory?
              </p>
              <div className="mt-6 space-y-3">
                {CADENCES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCadence(c.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      cadence === c.id
                        ? "border-accent-teal bg-accent-teal/10"
                        : "border-edge hover:border-edge-active"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{c.icon}</span>
                      <div>
                        <div className={`text-sm font-semibold ${cadence === c.id ? "text-accent-teal" : "text-content-primary"}`}>
                          {c.label}
                        </div>
                        <div className="text-xs text-content-secondary">{c.desc}</div>
                      </div>
                      {cadence === c.id && <span className="ml-auto text-accent-teal">✓</span>}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <label className="text-xs text-content-secondary">
                  Voice model for login debrief
                  <div className="mt-2 flex gap-3">
                    {(["rachel", "adam"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVoice(v)}
                        className={`flex-1 rounded-lg border py-2 text-sm capitalize transition-all ${
                          voice === v ? "border-accent-teal bg-accent-teal/10 text-accent-teal" : "border-edge text-content-secondary"
                        }`}
                      >
                        {v === "rachel" ? "🎙️" : "🎤"} {v}
                      </button>
                    ))}
                  </div>
                </label>
              </div>

              <p className="mt-3 text-[10px] text-content-secondary/60">You can change these anytime in Settings.</p>

              <div className="mt-6 flex gap-3">
                <button type="button" className="rounded-lg border border-edge px-4 py-3 text-sm hover:border-edge-active" onClick={() => setStep(0)}>
                  Back
                </button>
                <button type="button" className="flex-1 rounded-lg bg-accent-teal py-3 text-sm font-semibold text-bg-primary" onClick={() => setStep(2)}>
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ Step 3: Threshold ═══ */}
          {step === 2 && !activating && (
            <motion.div
              key="threshold"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="w-full max-w-lg rounded-2xl border border-edge/50 bg-bg-surface/60 p-8 backdrop-blur-xl"
            >
              <h2 className="font-display text-2xl font-bold">Score Threshold</h2>
              <p className="mt-2 text-sm text-content-secondary">
                Buildings that cross this score will trigger automated deep-research reports.
              </p>

              {/* Preset buttons */}
              <div className="mt-6 flex gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setThreshold(p.value)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-all ${
                      threshold === p.value
                        ? "border-accent-teal bg-accent-teal/10 text-accent-teal"
                        : "border-edge text-content-secondary hover:border-edge-active"
                    }`}
                  >
                    {p.label} ({p.value})
                  </button>
                ))}
              </div>

              {/* Slider */}
              <div className="mt-6">
                <input
                  type="range"
                  min={50}
                  max={95}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-accent-teal"
                />
                <div className="mt-3 text-center">
                  <span className="font-mono text-5xl font-bold text-accent-teal">{threshold}</span>
                </div>
              </div>

              {/* Live preview */}
              <div className="mt-4 rounded-lg border border-edge bg-bg-primary/60 p-3 text-center">
                <p className="text-xs text-content-secondary">
                  At threshold <span className="font-mono text-accent-teal">{threshold}</span>:
                </p>
                <p className="mt-1 font-mono text-sm text-content-primary">
                  ~{est.buildings} buildings in DFW currently qualify
                </p>
                <p className="text-xs text-content-secondary">
                  Estimated: {est.reports} new reports
                </p>
              </div>

              {error && (
                <div className="mt-3 rounded-md border border-accent-coral/40 p-3 text-sm text-accent-coral">{error}</div>
              )}

              <div className="mt-6 flex gap-3">
                <button type="button" className="rounded-lg border border-edge px-4 py-3 text-sm hover:border-edge-active" onClick={() => setStep(1)}>
                  Back
                </button>
                <button
                  type="button"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-accent-teal py-3 text-sm font-semibold text-bg-primary shadow-teal-glow disabled:opacity-50"
                  onClick={() => void finish()}
                >
                  {saving ? "Initializing..." : "Activate Intelligence Engine"}
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ Activation Animation ═══ */}
          {activating && (
            <motion.div
              key="activating"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-accent-teal border-t-transparent" />
              <p className="mt-4 font-display text-xl font-semibold text-accent-teal">
                Initializing your automation engine...
              </p>
              <p className="mt-2 text-sm text-content-secondary">
                Territory: {territory} · Cadence: {cadence} · Threshold: {threshold}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!isAuthenticated && !activating && (
          <p className="mt-6 text-xs text-content-secondary/60">
            Continuing as demo user ·{" "}
            <button
              type="button"
              className="text-accent-teal underline-offset-2 hover:underline"
              onClick={() => loginWithRedirect()}
            >
              Log in with Auth0
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
