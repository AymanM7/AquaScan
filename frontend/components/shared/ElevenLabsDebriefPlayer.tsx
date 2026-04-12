"use client";

import { useCallback, useEffect, useState } from "react";

import { apiJson } from "@/lib/api";
import { DEMO_REP_ID } from "@/lib/demoMode";
import { ONBOARDING_COOKIE } from "@/lib/onboarding-cookie";

type DebriefPayload = {
  script_text: string | null;
  elevenlabs_audio_url: string | null;
};

function isOnboarded(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${ONBOARDING_COOKIE}=1`));
}

export function ElevenLabsDebriefPlayer() {
  const [data, setData] = useState<DebriefPayload | null>(null);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(isOnboarded());
  }, []);

  const load = useCallback(async () => {
    if (!isOnboarded()) return;
    try {
      const qs = new URLSearchParams({ user_id: DEMO_REP_ID });
      const d = await apiJson<DebriefPayload>(`/api/debrief?${qs.toString()}`);
      setData(d);
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const regenerate = async () => {
    setLoading(true);
    try {
      const d = await apiJson<DebriefPayload>("/api/debrief/generate", {
        method: "POST",
        body: JSON.stringify({ user_id: DEMO_REP_ID }),
      });
      setData(d);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return null;

  if (!open) {
    return (
      <button
        type="button"
        className="fixed bottom-4 left-4 z-[60] rounded-full border border-edge-active bg-bg-surface-2 px-3 py-2 text-xs text-accent-teal shadow-teal-glow"
        onClick={() => setOpen(true)}
      >
        Debrief
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-[60] w-[min(100vw-2rem,22rem)] rounded-xl border border-edge bg-bg-surface/95 p-3 shadow-panel backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-accent-teal">
          Login debrief
        </span>
        <button
          type="button"
          className="text-content-secondary hover:text-content-primary"
          onClick={() => setOpen(false)}
          aria-label="Close debrief panel"
        >
          ✕
        </button>
      </div>
      {data?.elevenlabs_audio_url ? (
        <audio controls className="w-full" src={data.elevenlabs_audio_url}>
          <track kind="captions" />
        </audio>
      ) : (
        <p className="text-xs text-content-secondary">No audio yet — generate a fresh debrief.</p>
      )}
      {data?.script_text ? (
        <p className="mt-2 max-h-28 overflow-y-auto text-xs leading-relaxed text-content-secondary">
          {data.script_text}
        </p>
      ) : null}
      <button
        type="button"
        disabled={loading}
        onClick={() => void regenerate()}
        className="mt-2 w-full rounded-lg border border-edge-active bg-bg-surface-2 py-2 text-xs font-semibold text-accent-teal hover:bg-bg-primary disabled:opacity-50"
      >
        {loading ? "Generating…" : "Regenerate debrief"}
      </button>
    </div>
  );
}
